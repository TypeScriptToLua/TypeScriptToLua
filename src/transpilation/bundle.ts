import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled } from "../CompilerOptions";
import { escapeString } from "../LuaPrinter";
import { assert, normalizeSlashes } from "../utils";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { Chunk, EmitHost, getConfigDirectory, Module } from "./utils";

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

export function getBundleChunk(
    program: ts.Program,
    emitHost: EmitHost,
    modules: Module[],
    createModuleId: (file: Module) => string
): [ts.Diagnostic[], Chunk] {
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions() as CompilerOptions;
    assert(isBundleEnabled(options));
    const projectDirectory = getConfigDirectory(options, emitHost);
    const outputPath = normalizeSlashes(path.resolve(projectDirectory, options.luaBundle));

    // Resolve project settings relative to project file.
    const entryFileName = normalizeSlashes(path.resolve(projectDirectory, options.luaBundleEntry));
    const entryModule = modules.find(m => m.fileName === entryFileName);
    if (entryModule === undefined) {
        diagnostics.push(couldNotFindBundleEntryPoint(options.luaBundleEntry));
        return [diagnostics, { outputPath, code: "" }];
    }

    // For each file: ["<module path>"] = function() <lua content> end,
    const moduleTableEntries = modules.map(f => moduleSourceNode(f, escapeString(createModuleId(f))));

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

    // return require("<entry module path>")
    const bootstrap = `return require(${escapeString(createModuleId(entryModule))})\n`;

    const bundleNode = joinSourceChunks([requireOverride, moduleTable, bootstrap]);
    const { code, map } = bundleNode.toStringWithSourceMap();

    return [
        diagnostics,
        {
            outputPath,
            code,
            sourceMap: map.toString(),
            sourceFiles: modules.flatMap(x => x.sourceFiles ?? []),
        },
    ];
}

function moduleSourceNode({ code, sourceMapNode }: Module, modulePath: string): SourceNode {
    return joinSourceChunks([`[${modulePath}] = function()\n`, sourceMapNode ?? code, "\nend,\n"]);
}

function createModuleTableNode(fileChunks: SourceChunk[]): SourceNode {
    return joinSourceChunks(["____modules = {\n", ...fileChunks, "}\n"]);
}

type SourceChunk = string | SourceNode;
function joinSourceChunks(chunks: SourceChunk[]): SourceNode {
    return new SourceNode(null, null, null, chunks);
}
