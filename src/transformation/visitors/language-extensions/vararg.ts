import * as ts from "typescript";
import { TransformationContext } from "../../context";
import * as extensions from "../../utils/language-extensions";
import { Scope, ScopeType } from "../../utils/scope";

export function isGlobalVarargConstant(context: TransformationContext, symbol: ts.Symbol, scope: Scope) {
    return (
        scope.type === ScopeType.File &&
        extensions.isExtensionValue(context, symbol, extensions.ExtensionKind.VarargConstant)
    );
}

export function isVarargConstantNode(context: TransformationContext, node: ts.Node): boolean {
    const symbol = context.checker.getSymbolAtLocation(node);
    return symbol ? extensions.isExtensionValue(context, symbol, extensions.ExtensionKind.VarargConstant) : false;
}
