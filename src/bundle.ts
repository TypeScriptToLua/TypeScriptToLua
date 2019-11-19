import * as path from "path";
import { TranspiledFile, EmitHost } from "./Transpile";
import { SourceNode } from "source-map";
import { formatPathToLuaPath, trimExtension } from "./utils";
import { Diagnostic } from "typescript";
import { couldNotFindBundleEntryPoint } from "./diagnostics";

const formatPath = (path: string) => formatPathToLuaPath(trimExtension(path));

export function bundleTranspiledFiles(
    bundleFile: string,
    entryModule: string,
    transpiledFiles: TranspiledFile[],
    emitHost: EmitHost
): [Diagnostic[], TranspiledFile] {
    const diagnostics: Diagnostic[] = [];

    if (!transpiledFiles.some(f => f.fileName === entryModule)) {
        return [[couldNotFindBundleEntryPoint(entryModule)], { fileName: bundleFile }];
    }

    // For each file: ["<file name>"] = function() <lua content> end,
    const moduleTableEntries: SourceChunk[] = transpiledFiles.map(moduleSourceNode);

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
        `local ____originalRequire = require\n` +
        `function require(file) if ____modules[file] then return ____modules[file]() ` +
        `else print("Could not find module '"..file.."' to require."); return ____originalRequire(file) end end\n`;
    const entryPoint = `return require("${formatPath(entryModule)}")\n`;

    const bundleNode = joinSourceChunks([moduleTable, requireOverride, entryPoint]);
    const { code, map } = bundleNode.toStringWithSourceMap();

    return [
        diagnostics,
        {
            fileName: bundleFile,
            lua: code,
            sourceMap: map.toString(),
            sourceMapNode: moduleTable,
            declaration: undefined,
            declarationMap: undefined,
        },
    ];
}

function moduleSourceNode(transpiledFile: TranspiledFile): SourceNode {
    const tableEntryHead = `["${formatPath(transpiledFile.fileName)}"] = function() `;
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
