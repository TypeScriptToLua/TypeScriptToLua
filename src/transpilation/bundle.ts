import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions } from "../CompilerOptions";
import { getLuaLibBundle } from "../LuaLib";
import { escapeString } from "../LuaPrinter";
import { formatPathToLuaPath, normalizeSlashes, trimExtension } from "../utils";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { EmitHost, TranspiledFile } from "./transpile";

const createModulePath = (baseDir: string, pathToResolve: string) =>
    escapeString(formatPathToLuaPath(trimExtension(path.relative(baseDir, pathToResolve))));

export function bundleTranspiledFiles(
    bundleFile: string,
    entryModule: string,
    transpiledFiles: TranspiledFile[],
    program: ts.Program,
    emitHost: EmitHost
): [ts.Diagnostic[], TranspiledFile] {
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions() as CompilerOptions;

    const projectRootDir = options.configFilePath
        ? path.dirname(options.configFilePath)
        : emitHost.getCurrentDirectory();

    // Resolve project settings relative to project file.
    const resolvedEntryModule = path.resolve(projectRootDir, entryModule);
    const resolvedBundleFile = path.resolve(projectRootDir, bundleFile);

    // Resolve source files relative to common source directory.
    const sourceRootDir = program.getCommonSourceDirectory();
    if (!transpiledFiles.some(f => path.resolve(sourceRootDir, f.fileName) === resolvedEntryModule)) {
        return [[couldNotFindBundleEntryPoint(entryModule)], { fileName: bundleFile }];
    }

    // For each file: ["<module path>"] = function() <lua content> end,
    const moduleTableEntries: SourceChunk[] = transpiledFiles.map(f =>
        moduleSourceNode(f, createModulePath(sourceRootDir, f.fileName))
    );

    // If any of the modules contains a require for lualib_bundle, add it to the module table.
    const lualibRequired = transpiledFiles.some(f => f.lua?.includes(`require("lualib_bundle")`));
    if (lualibRequired) {
        moduleTableEntries.push(`["lualib_bundle"] = function() ${getLuaLibBundle(emitHost)} end,\n`);
    }

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

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
end\n`;

    // return require("<entry module path>")
    const entryPoint = `return require(${createModulePath(sourceRootDir, resolvedEntryModule)})\n`;

    const bundleNode = joinSourceChunks([requireOverride, moduleTable, entryPoint]);
    const { code, map } = bundleNode.toStringWithSourceMap();

    return [
        diagnostics,
        {
            fileName: normalizeSlashes(resolvedBundleFile),
            lua: code,
            sourceMap: map.toString(),
            sourceMapNode: moduleTable,
        },
    ];
}

function moduleSourceNode(transpiledFile: TranspiledFile, modulePath: string): SourceNode {
    const tableEntryHead = `[${modulePath}] = function() `;
    const tableEntryTail = `end,\n`;

    if (transpiledFile.lua && transpiledFile.sourceMapNode) {
        return joinSourceChunks([tableEntryHead, transpiledFile.sourceMapNode, tableEntryTail]);
    } else {
        return joinSourceChunks([tableEntryHead, tableEntryTail]);
    }
}

function createModuleTableNode(fileChunks: SourceChunk[]): SourceNode {
    const tableHead = `____modules = {\n`;
    const tableEnd = `}\n`;

    return joinSourceChunks([tableHead, ...fileChunks, tableEnd]);
}

type SourceChunk = string | SourceNode;
function joinSourceChunks(chunks: SourceChunk[]): SourceNode {
    // tslint:disable-next-line:no-null-keyword
    return new SourceNode(null, null, null, chunks);
}
