import * as fs from "fs";
import * as path from "path";
import * as resolve from "resolve";
import * as ts from "typescript";
// TODO: Don't depend on CLI?
import * as cliDiagnostics from "../cli/diagnostics";
import { CompilerOptions } from "../CompilerOptions";
import * as diagnosticFactories from "./diagnostics";
import { TranspilerHost } from "./transpiler";

// TODO: Require emit host
export const getConfigDirectory = (options: ts.CompilerOptions, host?: TranspilerHost) =>
    options.configFilePath ? path.dirname(options.configFilePath) : host?.getCurrentDirectory() ?? process.cwd();

export function resolvePlugin(
    kind: string,
    optionName: string,
    basedir: string,
    query: string,
    importName = "default"
): { error?: ts.Diagnostic; result?: unknown } {
    if (typeof query !== "string") {
        return { error: cliDiagnostics.compilerOptionRequiresAValueOfType(optionName, "string") };
    }

    let resolved: string;
    try {
        resolved = resolve.sync(query, { basedir, extensions: [".js", ".ts", ".tsx"] });
    } catch (err) {
        if (err.code !== "MODULE_NOT_FOUND") throw err;
        return { error: diagnosticFactories.couldNotResolveFrom(kind, query, basedir) };
    }

    const hasNoRequireHook = require.extensions[".ts"] === undefined;
    if (hasNoRequireHook && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) {
        try {
            const tsNodePath = resolve.sync("ts-node", { basedir });
            const tsNode: typeof import("ts-node") = require(tsNodePath);
            tsNode.register({ transpileOnly: true });
        } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") throw err;
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

const libCache = new Map<string, ts.SourceFile>();
export function createVirtualProgram(input: Record<string, string>, options: CompilerOptions = {}): ts.Program {
    function notImplemented(): never {
        throw new Error("Not implemented");
    }

    const getFileFromInput = (fileName: string) =>
        input[fileName] ?? (fileName.startsWith("/") ? input[fileName.slice(1)] : undefined);

    const compilerHost: ts.CompilerHost = {
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => "/",
        fileExists: fileName => fileName.startsWith("lib.") || getFileFromInput(fileName) !== undefined,
        readFile: notImplemented,
        writeFile: notImplemented,
        getDefaultLibFileName: ts.getDefaultLibFileName,
        getNewLine: () => "\n",

        getSourceFile(fileName) {
            const fileFromInput = getFileFromInput(fileName);
            if (fileFromInput !== undefined) {
                return ts.createSourceFile(fileName, fileFromInput, ts.ScriptTarget.Latest, false);
            }

            if (libCache.has(fileName)) return libCache.get(fileName)!;

            if (fileName.startsWith("lib.")) {
                const typeScriptDir = path.dirname(require.resolve("typescript"));
                const filePath = path.join(typeScriptDir, fileName);
                const content = fs.readFileSync(filePath, "utf8");

                const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, false);
                libCache.set(fileName, sourceFile);
                return sourceFile;
            }
        },
    };

    return ts.createProgram(Object.keys(input), options, compilerHost);
}
