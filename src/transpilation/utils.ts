import * as path from "path";
import * as resolve from "resolve";
import { SourceNode } from "source-map";
import * as ts from "typescript";
// TODO: Don't depend on CLI?
import * as cliDiagnostics from "../cli/diagnostics";
import * as lua from "../LuaAST";
import * as diagnosticFactories from "./diagnostics";

export interface EmitHost {
    directoryExists(path: string): boolean;
    fileExists(path: string): boolean;
    getCurrentDirectory(): string;
    readFile(path: string): string | undefined;
    writeFile: ts.WriteFileCallback;
}

interface BaseFile {
    code: string;
    sourceMap?: string;
    sourceFiles?: ts.SourceFile[];
}

export interface ProcessedFile extends BaseFile {
    fileName: string;
    luaAst?: lua.File;
    sourceMapNode?: SourceNode;
}

export interface EmitFile extends BaseFile {
    outputPath: string;
}

export const getConfigDirectory = (options: ts.CompilerOptions) =>
    options.configFilePath ? path.dirname(options.configFilePath) : process.cwd();

const getTstlDirectory = () => path.dirname(__dirname);

export function resolvePlugin(
    kind: string,
    optionName: string,
    basedir: string,
    query: unknown,
    importName = "default"
): { error?: ts.Diagnostic; result?: unknown } {
    if (typeof query !== "string") {
        return { error: cliDiagnostics.compilerOptionRequiresAValueOfType(optionName, "string") };
    }

    const isModuleNotFoundError = (error: any) => error.code === "MODULE_NOT_FOUND";

    let resolved: string;
    try {
        resolved = resolve.sync(query, { basedir, extensions: [".js", ".ts", ".tsx"] });
    } catch (err) {
        if (!isModuleNotFoundError(err)) throw err;
        return { error: diagnosticFactories.couldNotResolveFrom(kind, query, basedir) };
    }

    const hasNoRequireHook = require.extensions[".ts"] === undefined;
    if (hasNoRequireHook && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) {
        try {
            const tsNodePath = resolve.sync("ts-node", { basedir: getTstlDirectory() });
            const tsNode: typeof import("ts-node") = require(tsNodePath);
            tsNode.register({ transpileOnly: true });
        } catch (err) {
            if (!isModuleNotFoundError(err)) throw err;
            return { error: diagnosticFactories.toLoadItShouldBeTranspiled(kind, query) };
        }
    }

    const commonjsModule = require(resolved);
    const factoryModule = commonjsModule.__esModule ? commonjsModule : { default: commonjsModule };
    const result = factoryModule[importName];
    if (result === undefined) {
        return { error: diagnosticFactories.shouldHaveAExport(kind, query, importName) };
    }

    return { result };
}
