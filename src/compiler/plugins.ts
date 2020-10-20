import { Plugin as ResolvePlugin } from "enhanced-resolve";
import { Printer } from "../LuaPrinter";
import { Visitors } from "../transformation/context";
import { Chunk } from "./chunk";
import { Compilation } from "./compilation";
import { Module } from "./module";
import { loadConfigImport } from "./utils";

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
     * Provide extra [enhanced-resolve](https://github.com/webpack/enhanced-resolve) plugins,
     * used for `.lua` module resolution.
     */
    getResolvePlugins?(compilation: Compilation): ResolvePlugin[];

    /**
     * Transform modules into chunks.
     */
    mapModulesToChunks?(modules: Module[], compilation: Compilation): Chunk[];

    /**
     * Produce a unique identifier for a module, which would be used as `require` call parameter,
     * and may be used for chunk naming.
     */
    getModuleId?(module: Module, compilation: Compilation): string | undefined;
}

export function getPlugins(compilation: Compilation, customPlugins: Plugin[]): Plugin[] {
    const pluginsFromOptions: Plugin[] = [];

    for (const [index, pluginOption] of (compilation.options.luaPlugins ?? []).entries()) {
        const optionName = `tstl.luaPlugins[${index}]`;

        const { error: resolveError, result: factory } = loadConfigImport(
            "plugin",
            `${optionName}.name`,
            compilation.projectDir,
            pluginOption.name,
            pluginOption.import
        );

        if (resolveError) compilation.diagnostics.push(resolveError);
        if (factory === undefined) continue;

        const plugin = typeof factory === "function" ? factory(pluginOption) : factory;
        pluginsFromOptions.push(plugin);
    }

    return [...customPlugins, ...pluginsFromOptions];
}

export function applyBailPlugin<T>(plugins: Plugin[], callback: (plugin: Plugin) => T | undefined): T | undefined {
    for (const plugin of plugins) {
        const result = callback(plugin);
        if (result !== undefined) {
            return result;
        }
    }
}

export function applySinglePlugin<P extends keyof Plugin>(plugins: Plugin[], property: P): Plugin[P] | undefined {
    const results = plugins.filter(p => p[property] !== undefined);
    if (results.length === 1) {
        return results[0][property];
    } else if (results.length > 1) {
        throw new Error(`Only one plugin can specify '${property}'`);
    }
}
