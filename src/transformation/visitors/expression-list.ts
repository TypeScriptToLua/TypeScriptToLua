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

function processPrecedingStatements(
    context: TransformationContext,
    expressionInfo: ExpressionListInfo[],
    lastPrecedingStatementsIndex: number
) {
    if (lastPrecedingStatementsIndex < 0) {
        return;
    }

    for (let i = 0; i < expressionInfo.length; ++i) {
        const info = expressionInfo[i];

        // Bubble up preceding statements
        context.addPrecedingStatements(info.precedingStatements);

        // Cache expression in temp to maintain execution order, unless:
        // - Expression is after the last one in the list which generated preceding statements
        // - Expression is a literal that wouldn't be affected by preceding statements (includes optimized vararg '...')
        // - Expression is a temp identifier which is a result of preceding statements
        if (
            i >= lastPrecedingStatementsIndex ||
            lua.isLiteral(info.transformedExpression) ||
            isPrecedingStatementTemp(info)
        ) {
            continue;
        }

        // Strip 'unpack' from spreads to store in a temp - it will be added back in buildArrayConcatCall, if needed
        let expression = info.transformedExpression;
        if (info.isSpread) {
            assert(lua.isCallExpression(expression) && expression.params.length === 1);
            expression = expression.params[0];
            info.needsUnpack = true;
        }

        // Inject temp assignment in correct place in preceding statements
        const tempVar = context.createTempForLuaExpression(info.transformedExpression);
        const tempDeclaration = lua.createVariableDeclarationStatement(tempVar, expression);
        lua.setNodePosition(tempDeclaration, lua.getOriginalPos(expression));
        context.addPrecedingStatements([tempDeclaration]);
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
                    tbls.push(info.transformedExpression); // Optimize '{table.unpack(x)}' to just 'x'
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

    // Bubble up preceding statements, generating temps when needed to maintain execution order
    processPrecedingStatements(context, expressionInfo, lastPrecedingStatementsIndex);

    // If there are spreads in the middle, use the array concat lib function
    const firstSpreadIndex = expressionInfo.findIndex(i => i.isSpread);
    if (firstSpreadIndex >= 0 && firstSpreadIndex < expressionInfo.length - 1) {
        return buildArrayConcatCall(context, expressionInfo);
    }

    return expressionInfo.map(e => e.transformedExpression);
}
