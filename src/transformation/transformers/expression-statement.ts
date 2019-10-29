import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { transformBinaryExpressionStatement } from "./binary-expression";
import { transformDeleteExpressionStatement } from "./delete";
import { transformLuaTableExpressionStatement } from "./lua-table";
import { transformUnaryExpressionStatement } from "./unary-expression";

export const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
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

    const deleteExpressionResult = transformDeleteExpressionStatement(context, node);
    if (deleteExpressionResult) {
        return deleteExpressionResult;
    }

    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    const result = context.transformExpression(expression);
    return lua.isCallExpression(result) || lua.isMethodCallExpression(result)
        ? lua.createExpressionStatement(result)
        : // Assign expression statements to dummy to make sure they're legal Lua
          lua.createVariableDeclarationStatement(lua.createAnonymousIdentifier(), result);
};
