import { Printer } from "./LuaPrinter";
import { Visitors } from "./transformation/context";

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
     * Only one plugin can provide `printer`.
     */
    printer?: Printer;
}
