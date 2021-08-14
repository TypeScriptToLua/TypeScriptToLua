import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { isInTupleReturnFunction } from "../utils/annotations";
import { validateAssignment } from "../utils/assignment-validation";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { ScopeType, walkScopesUp } from "../utils/scope";
import { isArrayType } from "../utils/typescript";
import { transformArguments } from "./call";
import {
    returnsMultiType,
    shouldMultiReturnCallBeWrapped,
    isMultiFunctionCall,
    isMultiReturnType,
    isInMultiReturnFunction,
    isMultiReturnCall,
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

    if (!isInTupleReturnFunction(context, node)) {
        return [context.transformExpression(node)];
    }

    let results: lua.Expression[];

    // Parent function is a TupleReturn function
    if (ts.isArrayLiteralExpression(node)) {
        // If return expression is an array literal, leave out brackets.
        results = node.elements.map(e => context.transformExpression(e));
    } else if (!isMultiReturnCall(context, node) && isArrayType(context, expressionType)) {
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
