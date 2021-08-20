import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { validateAssignment } from "../utils/assignment-validation";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { ScopeType, walkScopesUp } from "../utils/scope";
import { transformArguments } from "./call";
import {
    returnsMultiType,
    shouldMultiReturnCallBeWrapped,
    isMultiFunctionCall,
    isMultiReturnType,
    isInMultiReturnFunction,
    canBeMultiReturnType,
} from "./language-extensions/multi";
import { invalidMultiFunctionReturnType } from "../utils/diagnostics";

function transformExpressionsInReturn(
    context: TransformationContext,
    node: ts.Expression,
    insideTryCatch: boolean
): lua.Expression[] {
    const expressionType = context.checker.getTypeAtLocation(node);

    if (ts.isCallExpression(node)) {
        // $multi(...)
        if (isMultiFunctionCall(context, node)) {
            // Don't allow $multi to be implicitly cast to something other than LuaMultiReturn
            const type = context.checker.getContextualType(node);
            if (type && !canBeMultiReturnType(type)) {
                context.diagnostics.push(invalidMultiFunctionReturnType(node));
            }

            let returnValues = transformArguments(context, node.arguments);
            if (insideTryCatch) {
                returnValues = [wrapInTable(...returnValues)]; // Wrap results when returning inside try/catch
            }
            return returnValues;
        }

        // Force-wrap LuaMultiReturn when returning inside try/catch
        if (insideTryCatch && returnsMultiType(context, node) && !shouldMultiReturnCallBeWrapped(context, node)) {
            return [wrapInTable(context.transformExpression(node))];
        }
    } else if (isInMultiReturnFunction(context, node) && isMultiReturnType(expressionType)) {
        // Unpack objects typed as LuaMultiReturn
        return [createUnpackCall(context, context.transformExpression(node), node)];
    }

    return [context.transformExpression(node)];
}

export function transformExpressionBodyToReturnStatement(
    context: TransformationContext,
    node: ts.Expression
): lua.Statement {
    const expressions = transformExpressionsInReturn(context, node, false);
    return lua.createReturnStatement(expressions, node);
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

        results = transformExpressionsInReturn(context, statement.expression, insideTryCatch);
    } else {
        // Empty return
        results = [];
    }

    if (insideTryCatch) {
        results.unshift(lua.createBooleanLiteral(true));
    }

    return lua.createReturnStatement(results, statement);
};
