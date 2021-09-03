import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { assert } from "../../utils";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

interface ExpressionListInfo {
    transformedExpression: lua.Expression;
    precedingStatements: lua.Statement[];
    isSpread: boolean;
    needsUnpack?: boolean;
}

function isPrecedingStatementTemp(info: ExpressionListInfo) {
    return info.precedingStatements.length > 0 && lua.isIdentifier(info.transformedExpression);
}

function cacheExpressionsInTemps(
    context: TransformationContext,
    expressionInfo: ExpressionListInfo[],
    lastPrecedingStatementsIndex: number
) {
    for (let i = 0; i < expressionInfo.length; ++i) {
        const info = expressionInfo[i];

        // Bubble up preceding statements
        context.addPrecedingStatements(info.precedingStatements);

        // Only cache expressions in front of the last one that created preceding statements
        if (i >= lastPrecedingStatementsIndex) continue;

        // Simple literals can't be affected by anything, so no need to cache them
        if (lua.isLiteral(info.transformedExpression)) continue;

        // If expression is just a temp result for other preceding statements, no need to cache
        if (isPrecedingStatementTemp(info)) continue;

        // Strip 'unpack' from spreads - we'll add it back later in buildArrayConcatCall
        let expression = info.transformedExpression;
        if (info.isSpread) {
            assert(lua.isCallExpression(expression) && expression.params.length === 1);
            expression = expression.params[0];
            info.needsUnpack = true;
        }

        // Inject temp assignment in correct place in preceding statements
        const tempVar = lua.createIdentifier(context.createTempNameFromExpression(info.transformedExpression));
        context.addPrecedingStatements([lua.createVariableDeclarationStatement(tempVar, expression)]);
        info.transformedExpression = lua.cloneIdentifier(tempVar);
    }
}

function buildArrayConcatCall(context: TransformationContext, expressionInfo: ExpressionListInfo[]) {
    const tbls: lua.Expression[] = [];
    let tbl: lua.Expression[] = [];
    for (const info of expressionInfo) {
        if (info.isSpread) {
            if (info.needsUnpack) {
                if (tbl.length === 0) {
                    tbls.push(info.transformedExpression);
                } else {
                    tbls.push(wrapInTable(...tbl, createUnpackCall(context, info.transformedExpression)));
                }
            } else {
                tbls.push(wrapInTable(...tbl, info.transformedExpression));
            }
            tbl = [];
        } else {
            tbl.push(info.transformedExpression);
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
    // Transform expressions and collect info about them
    let lastPrecedingStatementsIndex = -1;
    const transformListExpression = (expression: ts.Expression, index: number): ExpressionListInfo => {
        context.pushPrecedingStatements();
        const transformedExpression = context.transformExpression(expression);
        const precedingStatements = context.popPrecedingStatements();
        if (precedingStatements.length > 0) lastPrecedingStatementsIndex = index;
        return { transformedExpression, precedingStatements, isSpread: ts.isSpreadElement(expression) };
    };
    const expressionInfo = expressions.map(transformListExpression);

    // If there are preceding statements, cache expressions in temps to maintain execution order
    if (lastPrecedingStatementsIndex >= 0) {
        cacheExpressionsInTemps(context, expressionInfo, lastPrecedingStatementsIndex);
    }

    // If there are spreads in the middle, use the array concat lib function
    const firstSpreadIndex = expressionInfo.findIndex(i => i.isSpread);
    if (firstSpreadIndex >= 0 && firstSpreadIndex < expressionInfo.length - 1) {
        return buildArrayConcatCall(context, expressionInfo);
    }

    return expressionInfo.map(e => e.transformedExpression);
}
