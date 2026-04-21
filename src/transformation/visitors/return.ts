import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { validateAssignment } from "../utils/assignment-validation";
import { createUnpackCall, wrapInTable } from "../utils/lua-ast";
import { findAsyncTryScopeInStack, ScopeType, walkScopesUp } from "../utils/scope";
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
import { isInAsyncFunction } from "../utils/typescript";

function transformExpressionsInReturn(context: TransformationContext, node: ts.Expression): lua.Expression[] {
    const expressionType = context.checker.getTypeAtLocation(node);

    // skip type assertions
    // don't skip parenthesis as it may arise confusion with lua behavior (where parenthesis are significant)
    const innerNode = ts.skipOuterExpressions(node, ts.OuterExpressionKinds.Assertions);

    if (ts.isCallExpression(innerNode)) {
        // $multi(...)
        if (isMultiFunctionCall(context, innerNode)) {
            // Don't allow $multi to be implicitly cast to something other than LuaMultiReturn
            const type = context.checker.getContextualType(node);
            if (type && !canBeMultiReturnType(type)) {
                context.diagnostics.push(invalidMultiFunctionReturnType(innerNode));
            }

            return transformArguments(context, innerNode.arguments);
        }
    } else if (isInMultiReturnFunction(context, innerNode) && isMultiReturnType(expressionType)) {
        // Unpack objects typed as LuaMultiReturn
        return [createUnpackCall(context, context.transformExpression(innerNode), innerNode)];
    }

    return [context.transformExpression(node)];
}

export function transformExpressionBodyToReturnStatement(
    context: TransformationContext,
    node: ts.Expression
): lua.Statement {
    const expressions = transformExpressionsInReturn(context, node);
    return createReturnStatement(context, expressions, node);
}

function transformReturnExpressionForTryCatch(context: TransformationContext, node: ts.Expression): lua.Expression {
    const innerNode = ts.skipOuterExpressions(node, ts.OuterExpressionKinds.Assertions);

    if (ts.isCallExpression(innerNode)) {
        if (isMultiFunctionCall(context, innerNode)) {
            const type = context.checker.getContextualType(node);
            if (type && !canBeMultiReturnType(type)) {
                context.diagnostics.push(invalidMultiFunctionReturnType(innerNode));
            }
            return wrapInTable(...transformArguments(context, innerNode.arguments));
        }

        if (returnsMultiType(context, innerNode) && !shouldMultiReturnCallBeWrapped(context, innerNode)) {
            return wrapInTable(context.transformExpression(node));
        }
    }

    return context.transformExpression(node);
}

export const transformReturnStatement: FunctionVisitor<ts.ReturnStatement> = (statement, context) => {
    const asyncTryScope = isInAsyncFunction(statement) ? findAsyncTryScopeInStack(context) : undefined;

    if (statement.expression) {
        const expressionType = context.checker.getTypeAtLocation(statement.expression);
        const returnType = context.checker.getContextualType(statement.expression);
        if (returnType) {
            validateAssignment(context, statement, expressionType, returnType);
        }
    }

    if (asyncTryScope) {
        asyncTryScope.asyncTryHasReturn = true;
        const stmts: lua.Statement[] = [
            lua.createAssignmentStatement(
                lua.createIdentifier("____hasReturned"),
                lua.createBooleanLiteral(true),
                statement
            ),
        ];
        if (statement.expression) {
            const returnValue = transformReturnExpressionForTryCatch(context, statement.expression);
            stmts.push(lua.createAssignmentStatement(lua.createIdentifier("____returnValue"), returnValue, statement));
        }
        stmts.push(lua.createReturnStatement([], statement));
        return stmts;
    }

    let results: lua.Expression[];
    if (!statement.expression) {
        results = [];
    } else if (isInTryCatch(context)) {
        results = [transformReturnExpressionForTryCatch(context, statement.expression)];
    } else {
        results = transformExpressionsInReturn(context, statement.expression);
    }

    return createReturnStatement(context, results, statement);
};

export function createReturnStatement(
    context: TransformationContext,
    values: lua.Expression[],
    node: ts.Node
): lua.ReturnStatement {
    if (isInAsyncFunction(node)) {
        return lua.createReturnStatement([
            lua.createCallExpression(lua.createIdentifier("____awaiter_resolve"), [lua.createNilLiteral(), ...values]),
        ]);
    }

    if (isInTryCatch(context)) {
        // Bubble up explicit return flag and check if we're inside a try/catch block
        values = [lua.createBooleanLiteral(true), ...values];
    }

    return lua.createReturnStatement(values, node);
}

function isInTryCatch(context: TransformationContext): boolean {
    // Check if context is in a try or catch
    let insideTryCatch = false;
    for (const scope of walkScopesUp(context)) {
        scope.functionReturned = true;

        if (scope.type === ScopeType.Function) {
            break;
        }

        insideTryCatch = insideTryCatch || scope.type === ScopeType.Try || scope.type === ScopeType.Catch;
    }

    return insideTryCatch;
}
