import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { isOptimizedVarArgSpreadElement } from "./spread";
import { assert } from "../../utils";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

// Transforms a list of expressions while flattening spreads and maintaining execution order
export function transformExpressionList(
    context: TransformationContext,
    expressions: readonly ts.Expression[]
): lua.Expression[] {
    // Transform expressions and collect info about them
    let lastPrecedingStatementsIndex = -1;
    let firstSpreadIndex = -1;
    const transformedExpressionInfo = expressions.map((expression, i) => {
        context.pushPrecedingStatements();
        const transformedExpression = context.transformExpression(expression);
        const precedingStatements = context.popPrecedingStatements();

        if (precedingStatements.length > 0) lastPrecedingStatementsIndex = i;

        const isSpread = ts.isSpreadElement(expression) && !isOptimizedVarArgSpreadElement(context, expression);
        if (isSpread && firstSpreadIndex === -1) firstSpreadIndex = i;

        return { transformedExpression, precedingStatements, isSpread };
    });

    // If there are preceding statements, cache expressions in temps to maintain execution order
    if (lastPrecedingStatementsIndex >= 0) {
        for (let i = 0; i < transformedExpressionInfo.length; ++i) {
            const expressionInfo = transformedExpressionInfo[i];
            if (
                i < lastPrecedingStatementsIndex &&
                !lua.isLiteral(expressionInfo.transformedExpression) &&
                expressionInfo.precedingStatements.length === 0
            ) {
                const tempVar = lua.createIdentifier(
                    context.createTempNameFromExpression(expressionInfo.transformedExpression)
                );
                let expression = expressionInfo.transformedExpression;
                let tempExpression: lua.Expression = lua.cloneIdentifier(tempVar);

                // Spreads: strip unpack from original expression and add it to the temp's evaluation
                if (expressionInfo.isSpread) {
                    assert(lua.isCallExpression(expression) && expression.params.length === 1);
                    expression = expression.params[0];
                    tempExpression = createUnpackCall(context, tempExpression);
                }

                // Inject temp assignment in correct place in preceding statements
                context.addPrecedingStatements([lua.createVariableDeclarationStatement(tempVar, expression)]);
                expressionInfo.transformedExpression = tempExpression;
            }

            // Bubble up preceding statements
            context.addPrecedingStatements(expressionInfo.precedingStatements);
        }
    }

    // If there are spreads in the middle, use the array concat lib function
    if (firstSpreadIndex >= 0 && firstSpreadIndex < expressions.length - 1) {
        const tbls: lua.Expression[] = [];
        let tbl: lua.Expression[] = [];
        for (const expressionInfo of transformedExpressionInfo) {
            if (expressionInfo.isSpread) {
                tbls.push(wrapInTable(...tbl, expressionInfo.transformedExpression));
                tbl = [];
            } else {
                tbl.push(expressionInfo.transformedExpression);
            }
        }
        if (tbl.length > 0) {
            tbls.push(wrapInTable(...tbl));
        }
        return [
            createUnpackCall(context, transformLuaLibFunction(context, LuaLibFeature.ArrayConcat, undefined, ...tbls)),
        ];
    }

    return transformedExpressionInfo.map(e => e.transformedExpression);
}
