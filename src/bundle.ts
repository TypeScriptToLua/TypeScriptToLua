import { TranspiledFileWithSourceNode } from "./Transpile";
import { SourceNode } from "source-map";

const trimExtension = (fileName: string) => (fileName.endsWith(".ts") ? fileName.slice(0, -3) : fileName);
const formatPath = (fileName: string) => trimExtension(fileName).replace("/", ".");

export function bundleTranspiledFiles(
    bundleFile: string,
    entryModule: string,
    transpiledFiles: TranspiledFileWithSourceNode[]
): TranspiledFileWithSourceNode {
    const moduleTable = moduleTableNode(transpiledFiles);
    const requireOverride = `function require(file) return __Lua_BundleModules[file](); end\n`;
    const entryPoint = `return require("${formatPath(entryModule)}")\n`;

    const bundleNode = joinSourceChunks([moduleTable, requireOverride, entryPoint]);
    const { code, map } = bundleNode.toStringWithSourceMap();

    return {
        fileName: bundleFile,
        lua: code,
        sourceMap: map.toString(),
        sourceMapNode: moduleTable,
        declaration: mergeDeclarations(transpiledFiles),
        declarationMap: mergeDeclarations(transpiledFiles),
    };
}

function moduleSourceNode(transpiledFile: TranspiledFileWithSourceNode): SourceNode {
    const tableEntryHead = `["${formatPath(transpiledFile.fileName)}"] = function() `;
    const tableEntryTail = `end,\n`;

    if (transpiledFile.lua && transpiledFile.sourceMapNode) {
        return joinSourceChunks([tableEntryHead, transpiledFile.sourceMapNode, tableEntryTail]);
    } else {
        return joinSourceChunks([tableEntryHead, tableEntryTail]);
    }
}

function moduleTableNode(transpiledFiles: TranspiledFileWithSourceNode[]): SourceNode {
    const tableHead = `__Lua_BundleModules = {\n`;
    const tableEnd = `}\n`;
    const tableEntries = transpiledFiles.map(moduleSourceNode);

    return joinSourceChunks([tableHead, ...tableEntries, tableEnd]);
}

function mergeDeclarations(transpiledFiles: TranspiledFileWithSourceNode[]): string {
    return transpiledFiles
        .map(f => f.declaration)
        .filter(x => x !== undefined)
        .join("\n");
}

type SourceChunk = string | SourceNode;
function joinSourceChunks(chunks: SourceChunk[]): SourceNode {
    // tslint:disable-next-line:no-null-keyword
    return new SourceNode(null, null, null, chunks);
}
