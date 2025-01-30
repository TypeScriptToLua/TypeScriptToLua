import * as ts from "typescript";
import { EmitHost } from "..";
import { CompilerOptions } from "../CompilerOptions";
import { Printer } from "../LuaPrinter";
import { Visitors } from "../transformation/context";
import { EmitFile, getConfigDirectory, ProcessedFile, resolvePlugin } from "./utils";
import * as performance from "../measure-performance";

export interface Plugin {
    /**
     * An augmentation to the map of visitors that transform TypeScript AST to Lua AST.
     *
     * Key is a `SyntaxKind` of a processed node.
     */
    visitors?: Visitors;

    /**
     * A function that converts Lua AST to a string.
     *
     * At most one custom printer can be provided across all plugins.
     */
    printer?: Printer;

    /**
     * This function is called before transpilation of the TypeScript program starts.
     */
    beforeTransform?: (program: ts.Program, options: CompilerOptions, emitHost: EmitHost) => ts.Diagnostic[] | void;

    /**
     * This function is called after translating the input program to Lua, but before resolving dependencies or bundling.
     */
    afterPrint?: (
        program: ts.Program,
        options: CompilerOptions,
        emitHost: EmitHost,
        result: ProcessedFile[]
    ) => ts.Diagnostic[] | void;

    /**
     * This function is called after translating the input program to Lua, after resolving dependencies and after bundling.
     */
    beforeEmit?: (
        program: ts.Program,
        options: CompilerOptions,
        emitHost: EmitHost,
        result: EmitFile[]
    ) => ts.Diagnostic[] | void;

    /**
     * This function is called after translating the input program to Lua, after resolving dependencies, after bundling and writing files to disk.
     */
    afterEmit?: (
        program: ts.Program,
        options: CompilerOptions,
        emitHost: EmitHost,
        result: EmitFile[]
    ) => ts.Diagnostic[] | void;

    /**
     * This function is called when trying to resolve the .lua file corresponding to a Lua require statement. Allows you to provide
     * your own module resolution logic. If return value is undefined, regular module resolution is done.
     */
    moduleResolution?: (
        moduleIdentifier: string,
        requiringFile: string,
        options: CompilerOptions,
        emitHost: EmitHost
    ) => string | undefined;
}

export function getPlugins(program: ts.Program): { diagnostics: ts.Diagnostic[]; plugins: Plugin[] } {
    performance.startSection("getPlugins");
    const diagnostics: ts.Diagnostic[] = [];
    const pluginsFromOptions: Plugin[] = [];
    const options = program.getCompilerOptions() as CompilerOptions;

    for (const [index, pluginOption] of (options.luaPlugins ?? []).entries()) {
        const optionName = `tstl.luaPlugins[${index}]`;

        const factory = (() => {
            if ("plugin" in pluginOption) {
                return pluginOption.plugin;
            } else {
                const { error: resolveError, result: factory } = resolvePlugin(
                    "plugin",
                    `${optionName}.name`,
                    getConfigDirectory(options),
                    pluginOption.name,
                    pluginOption.import
                );

                if (resolveError) diagnostics.push(resolveError);
                return factory;
            }
        })();

        if (factory === undefined) continue;

        const plugin = typeof factory === "function" ? factory(pluginOption) : factory;
        pluginsFromOptions.push(plugin);
    }

    if (options.tstlVerbose) {
        console.log(`Loaded ${pluginsFromOptions.length} plugins`);
    }

    performance.endSection("getPlugins");

    return { diagnostics, plugins: pluginsFromOptions };
}
