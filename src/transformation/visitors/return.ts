import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { isInTupleReturnFunction, isTupleReturnCall } from "../utils/annotations";
import { validateAssignment } from "../utils/assignment-validation";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { ScopeType, walkScopesUp } from "../utils/scope";
import { isArrayType } from "../utils/typescript";

function transformExpressionToTupleExpressions(
    context: TransformationContext,
    node: ts.Expression,
    insideTryCatch: boolean
): lua.Expression[] {
    let results: lua.Expression[];
    const expressionType = context.checker.getTypeAtLocation(node);

    // Parent function is a TupleReturn function
    if (ts.isArrayLiteralExpression(node)) {
        // If return expression is an array literal, leave out brackets.
        results = node.elements.map(e => context.transformExpression(e));
    } else if (!isTupleReturnCall(context, node) && isArrayType(context, expressionType)) {
        // If return expression is an array-type and not another TupleReturn call, unpack it
        results = [createUnpackCall(context, context.transformExpression(node), node)];
    } else {
        results = [context.transformExpression(node)];
    }

    // Wrap tupleReturn results when returning inside try/catch
    if (insideTryCatch) {
        results = [wrapInTable(...results)];
    }

    return results;
}

export function transformExpressionBodyToReturnStatement(
    context: TransformationContext,
    node: ts.Expression
): lua.Statement {
    if (isInTupleReturnFunction(context, node)) {
        const results = transformExpressionToTupleExpressions(context, node, false);
        return lua.createReturnStatement(results, node);
    }

    return lua.createReturnStatement([context.transformExpression(node)]);
}

export const transformReturnStatement: FunctionVisitor<ts.ReturnStatement> = (statement, context) => {
    // Bubble up explicit return flag and check if we're inside a try/catch block
    let insideTryCatch = false;
    for (const scope of walkScopesUp(context)) {
        scope.functionReturned = true;

        if (scope.type === ScopeType.Function) {
            break;
        }

        insideTryCatch = insideTryCatch || scope.type === ScopeType.Try || scope.type === ScopeType.Catch;
    }

    let results: lua.Expression[];

    if (statement.expression) {
        const expressionType = context.checker.getTypeAtLocation(statement.expression);
        const returnType = context.checker.getContextualType(statement.expression);
        if (returnType) {
            validateAssignment(context, statement, expressionType, returnType);
        }

        if (isInTupleReturnFunction(context, statement)) {
            results = transformExpressionToTupleExpressions(context, statement.expression, insideTryCatch);
        } else {
            results = [context.transformExpression(statement.expression)];
        }
    } else {
        // Empty return
        results = [];
    }

    if (insideTryCatch) {
        results.unshift(lua.createBooleanLiteral(true));
    }

    return lua.createReturnStatement(results, statement);
};
