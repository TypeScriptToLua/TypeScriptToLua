import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { popScope, pushScope, Scope, ScopeType } from "../utils/scope";
import { getSymbolIdOfSymbol } from "../utils/symbols";

// Returns true if expressions before this one should be cached to preserve order.
// This is basically a place to check for situations where temps can be optimized out.
function shouldCachePreviousExpressions(context: TransformationContext, expression: ts.Expression, scope: Scope) {
    // ++i or i++ where i hasn't been referenced in previous expressions
    let symbol: ts.Symbol | undefined;
    let symbolId: lua.SymbolId | undefined;
    if (
        (ts.isPrefixUnaryExpression(expression) || ts.isPostfixUnaryExpression(expression)) &&
        ts.isIdentifier(expression.operand) &&
        (symbol = context.checker.getSymbolAtLocation(expression.operand)) &&
        (symbolId = getSymbolIdOfSymbol(context, symbol)) &&
        (!scope.referencedSymbols || !scope.referencedSymbols.has(symbolId))
    ) {
        return false;
    }
    return true;
}

export function moveToPrecedingTemp(context: TransformationContext, expression: lua.Expression) {
    const tempIdentifier = context.createTempForLuaExpression(expression);
    const tempDeclaration = lua.createVariableDeclarationStatement(tempIdentifier, expression);
    lua.setNodePosition(tempDeclaration, lua.getOriginalPos(expression));
    context.addPrecedingStatements([tempDeclaration]);
    const tempClone = lua.cloneIdentifier(tempIdentifier);
    lua.setNodePosition(tempClone, lua.getOriginalPos(tempIdentifier));
    return tempClone;
}

function transformExpressionsInOrder(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): [lua.Expression[], number] {
    const scope = pushScope(context, ScopeType.ExpressionList);

    const transformedExpressions: lua.Expression[] = [];
    const precedingStatements: lua.Statement[][] = [];
    let hasPrecedingStatements = false;
    let lastPrecedingStatementsIndex = -1;
    for (let i = 0; i < expressions.length; ++i) {
        const expression = expressions[i];
        const cachePrevious = shouldCachePreviousExpressions(context, expression, scope); // Must call before transform

        // Transform expression and catch preceding statements
        context.pushPrecedingStatements();
        const transformedExpression = context.transformExpression(expression);
        transformedExpressions.push(transformedExpression);
        const expressionPrecedingStatements = context.popPrecedingStatements();
        precedingStatements.push(expressionPrecedingStatements);

        // Track preceding statements
        if (expressionPrecedingStatements.length > 0) {
            hasPrecedingStatements = true;
            if (cachePrevious) {
                lastPrecedingStatementsIndex = i;
            }
        }
    }

    if (!hasPrecedingStatements) {
        popScope(context);
        return [transformedExpressions, lastPrecedingStatementsIndex];
    }

    for (let i = 0; i < transformedExpressions.length; ++i) {
        let transformedExpression = transformedExpressions[i];
        const expressionPrecedingStatements = precedingStatements[i];

        // Bubble up preceding statements
        context.addPrecedingStatements(expressionPrecedingStatements);

        // Cache expression in temp to maintain execution order, unless:
        // - Expression is after the last one in the list which generated preceding statements
        // - Expression is a literal that wouldn't be affected by preceding statements
        // - Expression is a temp identifier which is a result of preceding statements
        if (
            i >= lastPrecedingStatementsIndex ||
            lua.isLiteral(transformedExpression) ||
            (expressionPrecedingStatements.length > 0 && lua.isIdentifier(transformedExpression))
        ) {
            continue;
        }

        // Wrap spreads in table to store in a temp
        if (ts.isSpreadElement(expressions[i])) {
            transformedExpression = wrapInTable(transformedExpression);
        }

        transformedExpressions[i] = moveToPrecedingTemp(context, transformedExpression);
    }

    popScope(context);
    return [transformedExpressions, lastPrecedingStatementsIndex];
}

export function transformOrderedExpressions(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    const [transformedExpressions] = transformExpressionsInOrder(context, expressions);
    return transformedExpressions;
}

function buildArrayConcatCall(
    context: TransformationContext,
    expressions: readonly ts.Expression[],
    transformedExpressions: lua.Expression[],
    lastPrecedingStatementsIndex: number
) {
    const tbls: lua.Expression[] = [];
    let tbl: lua.Expression[] = [];
    for (let i = 0; i < expressions.length; ++i) {
        const transformedExpression = transformedExpressions[i];
        if (ts.isSpreadElement(expressions[i])) {
            if (i < lastPrecedingStatementsIndex) {
                // Spread statements cached in temps will need to be unpacked
                tbls.push(wrapInTable(...tbl, createUnpackCall(context, transformedExpression)));
            } else {
                tbls.push(wrapInTable(...tbl, transformedExpression));
            }
            tbl = [];
        } else {
            tbl.push(transformedExpression);
        }
    }
    if (tbl.length > 0) {
        tbls.push(wrapInTable(...tbl));
    }
    return [createUnpackCall(context, transformLuaLibFunction(context, LuaLibFeature.ArrayConcat, undefined, ...tbls))];
}

// Transforms a list of expressions while flattening spreads and maintaining execution order
export function transformExpressionList(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    const [transformedExpressions, lastPrecedingStatementsIndex] = transformExpressionsInOrder(context, expressions);

    // If there are spreads in the middle, use the array concat lib function
    const firstSpreadIndex = expressions.findIndex(i => ts.isSpreadElement(i));
    if (firstSpreadIndex >= 0 && firstSpreadIndex < expressions.length - 1) {
        return buildArrayConcatCall(context, expressions, transformedExpressions, lastPrecedingStatementsIndex);
    }

    return transformedExpressions;
}
