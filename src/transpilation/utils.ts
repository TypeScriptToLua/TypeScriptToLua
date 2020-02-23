import * as resolve from "resolve";
import * as ts from "typescript";
import * as path from "path";
// TODO: Don't depend on CLI?
import * as cliDiagnostics from "../cli/diagnostics";

export const getConfigDirectory = (options: ts.CompilerOptions) =>
    options.configFilePath ? path.dirname(options.configFilePath) : process.cwd();

interface ResolvePluginDiagnostics {
    couldNotResolveFrom(query: string, base: string): ts.Diagnostic;
    toLoadItShouldBeTranspiled(query: string): ts.Diagnostic;
    shouldHaveAExport(query: string, importName: string): ts.Diagnostic;
}

export function resolvePlugin(
    diagnostics: ResolvePluginDiagnostics,
    basedir: string,
    optionName: string,
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
        return { error: diagnostics.couldNotResolveFrom(query, basedir) };
    }

    // tslint:disable-next-line: deprecation
    const hasNoRequireHook = require.extensions[".ts"] === undefined;
    if (hasNoRequireHook && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) {
        try {
            const tsNodePath = resolve.sync("ts-node", { basedir });
            const tsNode: typeof import("ts-node") = require(tsNodePath);
            tsNode.register({ transpileOnly: true });
        } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") throw err;
            return { error: diagnostics.toLoadItShouldBeTranspiled(query) };
        }
    }

    const result = require(resolved)[importName];
    if (result === undefined) {
        return { error: diagnostics.shouldHaveAExport(query, importName) };
    }

    return { result };
}
