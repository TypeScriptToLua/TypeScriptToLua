import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, tempSymbolId } from "../context";
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

    return wrapInStatement(context.transformExpression(node.expression));
};

export function wrapInStatement(result: lua.Expression): lua.Statement | undefined {
    const isTempVariable = lua.isIdentifier(result) && result.symbolId === tempSymbolId;
    if (isTempVariable) {
        return undefined;
    }
    // "synthetic": no side effects and no original source
    const isSyntheticExpression = (lua.isIdentifier(result) || lua.isLiteral(result)) && result.line === undefined;
    if (isSyntheticExpression) {
        return undefined;
    }
    if (lua.isCallExpression(result) || lua.isMethodCallExpression(result)) {
        return lua.createExpressionStatement(result);
    }
    // Assign expression statements to dummy to make sure they're legal Lua
    return lua.createVariableDeclarationStatement(lua.createAnonymousIdentifier(), result);
}
