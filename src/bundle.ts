import * as path from "path";
import { TranspiledFile, EmitHost } from "./Transpile";
import { SourceNode } from "source-map";
import { formatPathToLuaPath, trimExtension, normalizeSlashes } from "./utils";
import { Diagnostic, Program } from "typescript";
import { couldNotFindBundleEntryPoint } from "./diagnostics";

const formatPath = (path: string) => formatPathToLuaPath(trimExtension(path));

export function bundleTranspiledFiles(
    bundleFile: string,
    entryModule: string,
    transpiledFiles: TranspiledFile[],
    program: Program,
    emitHost: EmitHost
): [Diagnostic[], TranspiledFile] {
    const diagnostics: Diagnostic[] = [];

    const resolvedEntryModule = resolveAbsolutePath(program, entryModule);
    if (!transpiledFiles.some(f => normalizeSlashes(f.fileName) === normalizeSlashes(resolvedEntryModule))) {
        return [[couldNotFindBundleEntryPoint(entryModule)], { fileName: bundleFile }];
    }

    // For each file: ["<file name>"] = function() <lua content> end,
    const projectRootDir = getProjectRootDir(program);
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
        `local ____originalRequire = require\n` +
        `function require(file) if ____modules[file] then return ____modules[file]() ` +
        `else print("Could not find module '"..file.."' to require."); return ____originalRequire(file) end end\n`;
    const entryPoint = `return require("${formatPath(entryModule)}")\n`;

    const bundleNode = joinSourceChunks([moduleTable, requireOverride, entryPoint]);
    const { code, map } = bundleNode.toStringWithSourceMap();

    return [
        diagnostics,
        {
            fileName: resolveAbsolutePath(program, bundleFile),
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

const getProjectRootDir = (program: Program) => program.getCommonSourceDirectory();

const resolveAbsolutePath = (program: Program, pathToResolve: string) =>
    path.isAbsolute(pathToResolve)
        ? pathToResolve
        : path.normalize(path.join(getProjectRootDir(program), pathToResolve));
