import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions } from "../CompilerOptions";
import { escapeString, tstlHeader } from "../LuaPrinter";
import { cast, formatPathToLuaPath, isNonNull, trimExtension } from "../utils";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { getEmitOutDir, getEmitPathRelativeToOutDir, getSourceDir } from "./transpiler";
import { EmitFile, ProcessedFile } from "./utils";

const createModulePath = (pathToResolve: string, program: ts.Program) =>
    escapeString(formatPathToLuaPath(trimExtension(getEmitPathRelativeToOutDir(pathToResolve, program))));

// Override `require` to read from ____modules table.
const requireOverride = `
local ____modules = {}
local ____moduleCache = {}
local ____originalRequire = require
local function require(file, ...)
    if ____moduleCache[file] then
        return ____moduleCache[file].value
    end
    if ____modules[file] then
        local module = ____modules[file]
        ____moduleCache[file] = { value = (select("#", ...) > 0) and module(...) or module(file) }
        return ____moduleCache[file].value
    else
        if ____originalRequire then
            return ____originalRequire(file)
        else
            error("module '" .. file .. "' not found")
        end
    end
end
`;

export function getBundleResult(program: ts.Program, files: ProcessedFile[]): [ts.Diagnostic[], EmitFile] {
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions() as CompilerOptions;
    const bundleFile = cast(options.luaBundle, isNonNull);
    const entryModule = cast(options.luaBundleEntry, isNonNull);

    // Resolve project settings relative to project file.
    const resolvedEntryModule = path.resolve(getSourceDir(program), entryModule);
    const outputPath = path.resolve(getEmitOutDir(program), bundleFile);

    if (program.getSourceFile(resolvedEntryModule) === undefined && program.getSourceFile(entryModule) === undefined) {
        diagnostics.push(couldNotFindBundleEntryPoint(entryModule));
    }

    // For each file: ["<module path>"] = function() <lua content> end,
    const moduleTableEntries = files.map(f => moduleSourceNode(f, createModulePath(f.fileName, program)));

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

    // return require("<entry module path>")
    const entryPoint = `return require(${createModulePath(entryModule, program)}, ...)\n`;

    const sourceChunks = [requireOverride, moduleTable, entryPoint];

    if (!options.noHeader) {
        sourceChunks.unshift(tstlHeader);
    }

    const bundleNode = joinSourceChunks(sourceChunks);
    const { code, map } = bundleNode.toStringWithSourceMap();

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
    const tableEntryHead = `[${modulePath}] = function(...) `;
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
