import * as ts from "typescript";
import { ExtensionKind } from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { invalidMultiFunctionUse, invalidRangeUse, invalidVarargUse } from "../../utils/diagnostics";

const extensionKindToValueName: { [T in ExtensionKind]?: string } = {
    [ExtensionKind.MultiFunction]: "$multi",
    [ExtensionKind.RangeFunction]: "$range",
    [ExtensionKind.VarargConstant]: "$vararg",
};
export function isIdentifierExtensionValue(symbol: ts.Symbol | undefined, extensionKind: ExtensionKind): boolean {
    return symbol !== undefined && extensionKindToValueName[extensionKind] === symbol.name;
}

export function reportInvalidExtensionValue(
    context: TransformationContext,
    identifier: ts.Identifier,
    extensionKind: ExtensionKind
): void {
    if (extensionKind === ExtensionKind.MultiFunction) {
        context.diagnostics.push(invalidMultiFunctionUse(identifier));
    } else if (extensionKind === ExtensionKind.RangeFunction) {
        context.diagnostics.push(invalidRangeUse(identifier));
    } else if (extensionKind === ExtensionKind.VarargConstant) {
        context.diagnostics.push(invalidVarargUse(identifier));
    }
}
