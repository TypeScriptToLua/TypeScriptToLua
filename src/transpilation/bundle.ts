import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions, LuaTarget } from "../CompilerOptions";
import { escapeString, tstlHeader } from "../LuaPrinter";
import { cast, formatPathToLuaPath, isNonNull, trimExtension } from "../utils";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { getEmitOutDir, getEmitPathRelativeToOutDir, getProjectRoot } from "./transpiler";
import { EmitFile, ProcessedFile } from "./utils";

const createModulePath = (pathToResolve: string, program: ts.Program) =>
    escapeString(formatPathToLuaPath(trimExtension(getEmitPathRelativeToOutDir(pathToResolve, program))));

// Override `require` to read from ____modules table.
function requireOverride(options: CompilerOptions) {
    const runModule =
        options.luaTarget === LuaTarget.Lua50
            ? "if (table.getn(arg) > 0) then value = module(unpack(arg)) else value = module(file) end"
            : 'if (select("#", ...) > 0) then value = module(...) else value = module(file) end';
    return `
local ____modules = {}
local ____moduleCache = {}
local ____originalRequire = require
local function require(file, ...)
    if ____moduleCache[file] then
        return ____moduleCache[file].value
    end
    if ____modules[file] then
        local module = ____modules[file]
        local value = nil
        ${runModule}
        ____moduleCache[file] = { value = value }
        return value
    else
        if ____originalRequire then
            return ____originalRequire(file)
        else
            error("module '" .. file .. "' not found")
        end
    end
end
`;
}

export const sourceMapTracebackBundlePlaceholder = "{#SourceMapTracebackBundle}";

type SourceMapLineData = number | { line: number; file: string };

export function printStackTraceBundleOverride(rootNode: SourceNode): string {
    const map: Record<number, SourceMapLineData> = {};
    const getLineNumber = (line: number, fallback: number) => {
        const data: SourceMapLineData | undefined = map[line];
        if (data === undefined) {
            return fallback;
        }
        if (typeof data === "number") {
            return data;
        }
        return data.line;
    };
    const transformLineData = (data: SourceMapLineData) => {
        if (typeof data === "number") {
            return data;
        }
        return `{line = ${data.line}, file = "${data.file}"}`;
    };

    let currentLine = 1;
    rootNode.walk((chunk, mappedPosition) => {
        if (mappedPosition.line !== undefined && mappedPosition.line > 0) {
            const line = getLineNumber(currentLine, mappedPosition.line);

            map[currentLine] = {
                line,
                file: path.basename(mappedPosition.source),
            };
        }

        currentLine += chunk.split("\n").length - 1;
    });

    const mapItems = Object.entries(map).map(([line, original]) => `["${line}"] = ${transformLineData(original)}`);
    const mapString = "{" + mapItems.join(",") + "}";

    return `__TS__SourceMapTraceBack(debug.getinfo(1).short_src, ${mapString});`;
}

export function getBundleResult(program: ts.Program, files: ProcessedFile[]): [ts.Diagnostic[], EmitFile] {
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions() as CompilerOptions;
    const bundleFile = cast(options.luaBundle, isNonNull);
    const entryModule = cast(options.luaBundleEntry, isNonNull);

    // Resolve project settings relative to project file.
    const resolvedEntryModule = path.resolve(getProjectRoot(program), entryModule);
    const outputPath = path.resolve(getEmitOutDir(program), bundleFile);
    const entryModuleFilePath =
        program.getSourceFile(entryModule)?.fileName ?? program.getSourceFile(resolvedEntryModule)?.fileName;

    if (entryModuleFilePath === undefined) {
        diagnostics.push(couldNotFindBundleEntryPoint(entryModule));
    }

    // For each file: ["<module path>"] = function() <lua content> end,
    const moduleTableEntries = files.map(f => moduleSourceNode(f, createModulePath(f.fileName, program)));

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

    // return require("<entry module path>")
    const args = options.luaTarget === LuaTarget.Lua50 ? "unpack(arg == nil and {} or arg)" : "...";
    const entryPoint = `return require(${createModulePath(entryModuleFilePath ?? entryModule, program)}, ${args})\n`;

    const footers: string[] = [];
    if (options.sourceMapTraceback) {
        // Generates SourceMapTraceback for the entire file
        footers.push(`local __TS__SourceMapTraceBack = require("${options.luaLibName ?? "lualib_bundle"}").__TS__SourceMapTraceBack\n`);
        footers.push(`${sourceMapTracebackBundlePlaceholder}\n`);
    }

    const sourceChunks = [requireOverride(options), moduleTable, ...footers, entryPoint];

    if (!options.noHeader) {
        sourceChunks.unshift(tstlHeader);
    }

    const bundleNode = joinSourceChunks(sourceChunks);
    let { code, map } = bundleNode.toStringWithSourceMap();
    code = code.replace(sourceMapTracebackBundlePlaceholder, printStackTraceBundleOverride(bundleNode));

    return [
        diagnostics,
        {
            outputPath,
            code,
            sourceMap: map.toString(),
            sourceFiles: files.flatMap(x => x.sourceFiles ?? []),
        },
    ];
}

function moduleSourceNode({ code, sourceMapNode }: ProcessedFile, modulePath: string): SourceNode {
    const tableEntryHead = `[${modulePath}] = function(...) \n`;
    const tableEntryTail = " end,\n";

    return joinSourceChunks([tableEntryHead, sourceMapNode ?? code, tableEntryTail]);
}

function createModuleTableNode(fileChunks: SourceChunk[]): SourceNode {
    const tableHead = "____modules = {\n";
    const tableEnd = "}\n";

    return joinSourceChunks([tableHead, ...fileChunks, tableEnd]);
}

type SourceChunk = string | SourceNode;

function joinSourceChunks(chunks: SourceChunk[]): SourceNode {
    return new SourceNode(null, null, null, chunks);
}
