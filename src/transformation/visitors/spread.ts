import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { createUnpackCall } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import {
    findScope,
    hasReferencedSymbol,
    hasReferencedUndefinedLocalFunction,
    isFunctionScopeWithDefinition,
    ScopeType,
} from "../utils/scope";
import { isArrayType, findFirstNonOuterParent } from "../utils/typescript";
import { isMultiReturnCall } from "./language-extensions/multi";
import { isGlobalVarargConstant } from "./language-extensions/vararg";

export function isOptimizedVarArgSpread(context: TransformationContext, symbol: ts.Symbol, identifier: ts.Identifier) {
    if (!ts.isSpreadElement(findFirstNonOuterParent(identifier))) {
        return false;
    }

    // Walk up, stopping at any scope types which could stop optimization
    const scope = findScope(context, ScopeType.Function | ScopeType.Try | ScopeType.Catch | ScopeType.File);
    if (!scope) {
        return;
    }

    // $vararg global constant
    if (isGlobalVarargConstant(context, symbol, scope)) {
        return true;
    }

    // Scope must be a function scope associated with a real ts function
    if (!isFunctionScopeWithDefinition(scope)) {
        return false;
    }

    // Scope cannot be an async function
    if (scope.node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
        return false;
    }

    // Identifier must be a vararg in the local function scope's parameters
    const isSpreadParameter = (p: ts.ParameterDeclaration) =>
        p.dotDotDotToken && ts.isIdentifier(p.name) && context.checker.getSymbolAtLocation(p.name) === symbol;
    if (!scope.node.parameters.some(isSpreadParameter)) {
        return false;
    }

    // De-optimize if already referenced outside of a spread, as the array may have been modified
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
    const tsInnerExpression = ts.skipOuterExpressions(node.expression);
    if (ts.isIdentifier(tsInnerExpression)) {
        const symbol = context.checker.getSymbolAtLocation(tsInnerExpression);
        if (symbol && isOptimizedVarArgSpread(context, symbol, tsInnerExpression)) {
            return lua.createDotsLiteral(node);
        }
    }

    const innerExpression = context.transformExpression(node.expression);
    if (isMultiReturnCall(context, tsInnerExpression)) return innerExpression;

    const type = context.checker.getTypeAtLocation(node.expression); // not ts-inner expression, in case of casts
    if (isArrayType(context, type)) {
        return createUnpackCall(context, innerExpression, node);
    }

    return transformLuaLibFunction(context, LuaLibFeature.Spread, node, innerExpression);
};
