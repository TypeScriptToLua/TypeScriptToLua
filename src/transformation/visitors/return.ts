import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { isInTupleReturnFunction, isTupleReturnCall } from "../utils/annotations";
import { validateAssignment } from "../utils/assignment-validation";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { ScopeType, walkScopesUp } from "../utils/scope";
import { isArrayType } from "../utils/typescript";

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
            // Parent function is a TupleReturn function
            if (ts.isArrayLiteralExpression(statement.expression)) {
                // If return expression is an array literal, leave out brackets.
                results = statement.expression.elements.map(e => context.transformExpression(e));
            } else if (!isTupleReturnCall(context, statement.expression) && isArrayType(context, expressionType)) {
                // If return expression is an array-type and not another TupleReturn call, unpack it
                results = [
                    createUnpackCall(context, context.transformExpression(statement.expression), statement.expression),
                ];
            } else {
                results = [context.transformExpression(statement.expression)];
            }

            // Wrap tupleReturn results when returning inside try/catch
            if (insideTryCatch) {
                results = [wrapInTable(...results)];
            }
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
