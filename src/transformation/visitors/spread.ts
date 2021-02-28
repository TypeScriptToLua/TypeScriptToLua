import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { AnnotationKind, isTupleReturnCall, isVarargType } from "../utils/annotations";
import { createUnpackCall } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { findScope, hasReferencedSymbol, hasReferencedUndefinedLocalFunction, ScopeType } from "../utils/scope";
import { isArrayType } from "../utils/typescript";
import { returnsMultiType } from "./language-extensions/multi";
import { annotationDeprecated } from "../utils/diagnostics";
import { ExtensionKind, isExtensionValue } from "../utils/language-extensions";

export function isOptimizableVarArgSpread(
    context: TransformationContext,
    symbol: ts.Symbol,
    identifier: ts.Identifier
) {
    if (!ts.isSpreadElement(identifier.parent)) {
        return false;
    }
    // Check for scopes which would stop optimization
    const scope = findScope(context, ScopeType.Function | ScopeType.Try | ScopeType.Catch | ScopeType.File);
    if (scope?.type === ScopeType.File && isExtensionValue(context, symbol, ExtensionKind.VarargConstant)) {
        return true; // $vararg global constant
    }
    if (!scope?.node || !ts.isFunctionLike(scope.node)) {
        return false;
    }
    // Identifier must be a var arg in the local function scope
    function isSpreadParameter(p: ts.ParameterDeclaration) {
        return p.dotDotDotToken && ts.isIdentifier(p.name) && context.checker.getSymbolAtLocation(p.name) === symbol;
    }
    if (!scope.node.parameters.some(isSpreadParameter)) {
        return false;
    }
    // De-optimize if already referenced in outside of a spread, as the array may have been modified
    if (hasReferencedSymbol(context, scope, symbol)) {
        return false;
    }
    // De-optimize if a function is being hoisted from below to above, as it may have modified the array
    if (hasReferencedUndefinedLocalFunction(context, scope)) {
        return false;
    }
    return true;
}

// TODO: Currently it's also used as an array member
export const transformSpreadElement: FunctionVisitor<ts.SpreadElement> = (node, context) => {
    if (ts.isIdentifier(node.expression)) {
        if (isVarargType(context, node.expression)) {
            context.diagnostics.push(annotationDeprecated(node, AnnotationKind.Vararg));
            return lua.createDotsLiteral(node);
        }
        const symbol = context.checker.getSymbolAtLocation(node.expression);
        if (symbol && isOptimizableVarArgSpread(context, symbol, node.expression)) {
            return lua.createDotsLiteral(node);
        }
    }

    const innerExpression = context.transformExpression(node.expression);
    if (isTupleReturnCall(context, node.expression)) return innerExpression;
    if (ts.isCallExpression(node.expression) && returnsMultiType(context, node.expression)) return innerExpression;

    const type = context.checker.getTypeAtLocation(node.expression);
    if (isArrayType(context, type)) {
        return createUnpackCall(context, innerExpression, node);
    }

    return transformLuaLibFunction(context, LuaLibFeature.Spread, node, innerExpression);
};
