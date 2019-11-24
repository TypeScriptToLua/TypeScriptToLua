import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { resolveFromRootDir } from "./resolve";
import { EmitHost, TranspiledFile } from "./Transpile";
import { formatPathToLuaPath, trimExtension } from "./utils";

const formatPath = (path: string) => formatPathToLuaPath(trimExtension(path));

export function bundleTranspiledFiles(
    bundleFile: string,
    entryModule: string,
    transpiledFiles: TranspiledFile[],
    program: ts.Program,
    emitHost: EmitHost
): [ts.Diagnostic[], TranspiledFile] {
    const diagnostics: ts.Diagnostic[] = [];

    const resolvedEntryModule = resolveFromRootDir(program, entryModule);
    if (!transpiledFiles.some(f => resolveFromRootDir(program, f.fileName) === resolvedEntryModule)) {
        return [[couldNotFindBundleEntryPoint(entryModule)], { fileName: bundleFile }];
    }

    // For each file: ["<file name>"] = function() <lua content> end,
    const projectRootDir = program.getCommonSourceDirectory();
    const moduleTableEntries: SourceChunk[] = transpiledFiles.map(f => moduleSourceNode(f, projectRootDir));

    // If any of the modules contains a require for lualib_bundle, add it to the module table.
    const lualibRequired = transpiledFiles.some(f => f.lua && f.lua.match(/require\("lualib_bundle"\)/));
    if (lualibRequired) {
        const lualibBundle = emitHost.readFile(path.resolve(__dirname, "../dist/lualib/lualib_bundle.lua"));
        moduleTableEntries.push(`["lualib_bundle"] = function() ${lualibBundle} end,\n`);
    }

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

    // Override `require` to read from ____modules table.
    const requireOverride =
        `local ____moduleCache = {}\n` +
        `local ____originalRequire = require\n` +
        `function require(file) if ____moduleCache[file] then return ____moduleCache[file] end\n` +
        `if ____modules[file] then ____moduleCache[file] = ____modules[file](); return ____moduleCache[file] ` +
        `else print("Could not find module '"..file.."' to require."); return ____originalRequire(file) end end\n`;
    const entryPoint = `return require("${formatPath(entryModule)}")\n`;

    const bundleNode = joinSourceChunks([moduleTable, requireOverride, entryPoint]);
    const { code, map } = bundleNode.toStringWithSourceMap();

    return [
        diagnostics,
        {
            fileName: path.join(program.getCommonSourceDirectory(), bundleFile),
            lua: code,
            sourceMap: map.toString(),
            sourceMapNode: moduleTable,
            declaration: undefined,
            declarationMap: undefined,
        },
    ];
}

function moduleSourceNode(transpiledFile: TranspiledFile, projectRootDir: string): SourceNode {
    const resolvedProjectPath = path.relative(projectRootDir, transpiledFile.fileName);
    const tableEntryHead = `["${formatPath(resolvedProjectPath)}"] = function() `;
    const tableEntryTail = `end,\n`;

    if (transpiledFile.lua && transpiledFile.sourceMapNode) {
        return joinSourceChunks([tableEntryHead, transpiledFile.sourceMapNode, tableEntryTail]);
    } else {
        return joinSourceChunks([tableEntryHead, tableEntryTail]);
    }
}

function createModuleTableNode(fileChunks: SourceChunk[]): SourceNode {
    const tableHead = `local ____modules = {\n`;
    const tableEnd = `}\n`;

    return joinSourceChunks([tableHead, ...fileChunks, tableEnd]);
}

type SourceChunk = string | SourceNode;
function joinSourceChunks(chunks: SourceChunk[]): SourceNode {
    // tslint:disable-next-line:no-null-keyword
    return new SourceNode(null, null, null, chunks);
}
