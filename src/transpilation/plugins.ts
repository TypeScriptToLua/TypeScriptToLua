import * as ts from "typescript";
import { Printer } from "../LuaPrinter";
import { Visitors } from "../transformation/context";

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

export function getPlugins(
    _program: ts.Program,
    _diagnostics: ts.Diagnostic[],
    pluginsFromOptions: Plugin[]
): Plugin[] {
    return pluginsFromOptions;
}
