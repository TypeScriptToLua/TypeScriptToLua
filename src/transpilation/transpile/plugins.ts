import { Printer } from "../../LuaPrinter";
import { Visitors } from "../../transformation/context";
import { Transpilation } from "../transpilation";
import { getConfigDirectory, resolvePlugin } from "../utils";

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
}

export function getPlugins(transpilation: Transpilation, customPlugins: Plugin[]): Plugin[] {
    const pluginsFromOptions: Plugin[] = [];

    for (const [index, pluginOption] of (transpilation.options.luaPlugins ?? []).entries()) {
        const optionName = `tstl.luaPlugins[${index}]`;

        const { error: resolveError, result: factory } = resolvePlugin(
            "plugin",
            `${optionName}.name`,
            getConfigDirectory(transpilation.options),
            pluginOption.name,
            pluginOption.import
        );

        if (resolveError) transpilation.diagnostics.push(resolveError);
        if (factory === undefined) continue;

        const plugin = typeof factory === "function" ? factory(pluginOption) : factory;
        pluginsFromOptions.push(plugin);
    }

    return [...customPlugins, ...pluginsFromOptions];
}
