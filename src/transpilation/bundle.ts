import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions } from "../CompilerOptions";
import { escapeString } from "../LuaPrinter";
import { cast, formatPathToLuaPath, isNonNull, normalizeSlashes, trimExtension } from "../utils";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { EmitFile, EmitHost, ProcessedFile } from "./utils";

const createModulePath = (baseDir: string, pathToResolve: string) =>
    escapeString(formatPathToLuaPath(trimExtension(path.relative(baseDir, pathToResolve))));

// Override `require` to read from ____modules table.
const requireOverride = `
local ____modules = {}
local ____moduleCache = {}
local ____originalRequire = require
local function require(file)
    if ____moduleCache[file] then
        return ____moduleCache[file]
    end
    if ____modules[file] then
        ____moduleCache[file] = ____modules[file]()
        return ____moduleCache[file]
    else
        if ____originalRequire then
            return ____originalRequire(file)
        else
            error("module '" .. file .. "' not found")
        end
    end
end
`;

export function getBundleResult(
    program: ts.Program,
    emitHost: EmitHost,
    files: ProcessedFile[]
): [ts.Diagnostic[], EmitFile] {
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions() as CompilerOptions;
    const bundleFile = cast(options.luaBundle, isNonNull);
    const entryModule = cast(options.luaBundleEntry, isNonNull);

    const rootDir = program.getCommonSourceDirectory();
    const outDir = options.outDir ?? rootDir;
    const projectRootDir = options.configFilePath
        ? path.dirname(options.configFilePath)
        : emitHost.getCurrentDirectory();

    // Resolve project settings relative to project file.
    const resolvedEntryModule = path.resolve(projectRootDir, entryModule);
    const outputPath = normalizeSlashes(path.resolve(projectRootDir, bundleFile));

    if (!files.some(f => f.fileName === resolvedEntryModule)) {
        diagnostics.push(couldNotFindBundleEntryPoint(entryModule));
        return [diagnostics, { outputPath, code: "" }];
    }

    // For each file: ["<module path>"] = function() <lua content> end,
    const moduleTableEntries = files.map(f => moduleSourceNode(f, createModulePath(outDir, f.fileName)));

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

    // return require("<entry module path>")
    const entryPoint = `return require(${createModulePath(outDir, resolvedEntryModule)})\n`;

    const bundleNode = joinSourceChunks([requireOverride, moduleTable, entryPoint]);
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
    const tableEntryHead = `[${modulePath}] = function() `;
    const tableEntryTail = "end,\n";

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
