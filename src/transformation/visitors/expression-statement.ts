import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, tempSymbolId, TransformationContext } from "../context";
import { transformBinaryExpressionStatement } from "./binary-expression";
import { transformUnaryExpressionStatement } from "./unary-expression";

export const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    const unaryExpressionResult = transformUnaryExpressionStatement(context, node);
    if (unaryExpressionResult) {
        return unaryExpressionResult;
    }

    const binaryExpressionResult = transformBinaryExpressionStatement(context, node);
    if (binaryExpressionResult) {
        return binaryExpressionResult;
    }

    return transformExpressionToStatement(context, node.expression);
};

export function transformExpressionToStatement(
    context: TransformationContext,
    expression: ts.Expression
): lua.Statement[] | lua.Statement | undefined {
    const result = context.transformExpression(expression);

    // omit temp identifiers, and non-side effect expressions without source map position
    if (
        (lua.isIdentifier(result) && result.symbolId === tempSymbolId) ||
        ((lua.isIdentifier(result) || lua.isLiteral(result)) && result.line === undefined)
    ) {
        return undefined;
    }

    return lua.isCallExpression(result) || lua.isMethodCallExpression(result)
        ? lua.createExpressionStatement(result)
        : // Assign expression statements to dummy to make sure they're legal Lua
          lua.createVariableDeclarationStatement(lua.createAnonymousIdentifier(), result);
}
