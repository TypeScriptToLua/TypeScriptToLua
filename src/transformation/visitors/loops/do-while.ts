import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { transformLoopBody } from "./utils";

export const transformWhileStatement: FunctionVisitor<ts.WhileStatement> = (statement, context) =>
    lua.createWhileStatement(
        lua.createBlock(transformLoopBody(context, statement)),
        context.transformExpression(statement.expression),
        statement
    );

export const transformDoStatement: FunctionVisitor<ts.DoStatement> = (statement, context) => {
    const body = lua.createDoStatement(transformLoopBody(context, statement));
    let condition = context.transformExpression(statement.expression);
    if (lua.isUnaryExpression(condition) && condition.operator === lua.SyntaxKind.NotOperator) {
        condition = condition.operand;
    } else {
        condition = lua.createUnaryExpression(condition, lua.SyntaxKind.NotOperator);
    }

    return lua.createRepeatStatement(lua.createBlock([body]), condition, statement);
};
