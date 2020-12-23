import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { transformBinaryExpressionStatement } from "./binary-expression";
import { transformLuaTableExpressionStatement } from "./lua-table";
import { transformUnaryExpressionStatement } from "./unary-expression";
import { returnsMultiType, transformMultiDestructuringAssignmentStatement } from "./language-extensions/multi";

export const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    if (
        ts.isBinaryExpression(node.expression) &&
        node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isCallExpression(node.expression.right) &&
        returnsMultiType(context, node.expression.right)
    ) {
        return transformMultiDestructuringAssignmentStatement(context, node);
    }

    const luaTableResult = transformLuaTableExpressionStatement(context, node);
    if (luaTableResult) {
        return luaTableResult;
    }

    const unaryExpressionResult = transformUnaryExpressionStatement(context, node);
    if (unaryExpressionResult) {
        return unaryExpressionResult;
    }

    const binaryExpressionResult = transformBinaryExpressionStatement(context, node);
    if (binaryExpressionResult) {
        return binaryExpressionResult;
    }

    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    const result = context.transformExpression(expression);
    return lua.isCallExpression(result) || lua.isMethodCallExpression(result)
        ? lua.createExpressionStatement(result)
        : // Assign expression statements to dummy to make sure they're legal Lua
          lua.createVariableDeclarationStatement(lua.createAnonymousIdentifier(), result);
};
