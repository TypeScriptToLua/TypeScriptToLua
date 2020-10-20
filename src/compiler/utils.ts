import { create as createResolve } from "enhanced-resolve";
import * as ts from "typescript";
// TODO: Don't depend on CLI?
import * as cliDiagnostics from "../cli/diagnostics";
import { assert } from "../utils";
import * as diagnosticFactories from "./diagnostics";

// https://github.com/webpack/enhanced-resolve/blob/0001f80dacf033ac4a0e690b2766e0965c458266/lib/Resolver.js#L280-L288
export const isResolveError = (error: unknown): error is Error & { details: string } =>
    error instanceof Error && "details" in error;

const resolveConfigImport = createResolve.sync({ extensions: [".js", ".ts", ".tsx"] });

export function loadConfigImport(
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
        const result = resolveConfigImport({}, basedir, query);
        assert(typeof result === "string");
        resolved = result;
    } catch (error) {
        if (!isResolveError(error)) throw error;
        return { error: diagnosticFactories.couldNotResolveFrom(kind, query, basedir) };
    }

    const hasNoRequireHook = require.extensions[".ts"] === undefined;
    if (hasNoRequireHook && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) {
        try {
            require("ts-node/register/transpile-only");
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
