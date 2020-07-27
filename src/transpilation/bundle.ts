import * as path from "path";
import { SourceNode } from "source-map";
import * as ts from "typescript";
import { CompilerOptions, isBundleEnabled } from "../CompilerOptions";
import { escapeString } from "../LuaPrinter";
import { assert, normalizeSlashes } from "../utils";
import { couldNotFindBundleEntryPoint } from "./diagnostics";
import { EmitFile, EmitHost, ProcessedFile } from "./utils";

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
    files: ProcessedFile[],
    getRequirePath: (file: ProcessedFile) => string
): [ts.Diagnostic[], EmitFile] {
    const diagnostics: ts.Diagnostic[] = [];

    const options = program.getCompilerOptions() as CompilerOptions;
    assert(isBundleEnabled(options));
    const bundleFile = options.luaBundle;
    const entryModule = options.luaBundleEntry;
    const projectRootDir = options.configFilePath
        ? path.dirname(options.configFilePath)
        : emitHost.getCurrentDirectory();
    const outputPath = normalizeSlashes(path.resolve(projectRootDir, bundleFile));

    // Resolve project settings relative to project file.
    const resolvedEntryModule = path.resolve(projectRootDir, entryModule);
    const entryFile = files.find(f => f.fileName === resolvedEntryModule);
    if (entryFile === undefined) {
        diagnostics.push(couldNotFindBundleEntryPoint(entryModule));
        return [diagnostics, { outputPath, code: "" }];
    }

    // For each file: ["<module path>"] = function() <lua content> end,
    const moduleTableEntries = files.map(f => moduleSourceNode(f, escapeString(getRequirePath(f))));

    // Create ____modules table containing all entries from moduleTableEntries
    const moduleTable = createModuleTableNode(moduleTableEntries);

    // return require("<entry module path>")
    const entryPoint = `return require(${escapeString(getRequirePath(entryFile))})\n`;

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
    return joinSourceChunks([`[${modulePath}] = function()\n`, sourceMapNode ?? code, "\nend,\n"]);
}

function createModuleTableNode(fileChunks: SourceChunk[]): SourceNode {
    return joinSourceChunks(["____modules = {\n", ...fileChunks, "}\n"]);
}

type SourceChunk = string | SourceNode;
function joinSourceChunks(chunks: SourceChunk[]): SourceNode {
    return new SourceNode(null, null, null, chunks);
}
