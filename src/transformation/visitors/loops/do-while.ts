import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor } from "../../context";
import { transformLoopBody } from "./utils";

export const transformWhileStatement: FunctionVisitor<ts.WhileStatement> = (statement, context) => {
    return lua.createWhileStatement(
        lua.createBlock(transformLoopBody(context, statement)),
        context.transformExpression(statement.expression),
        statement
    );
};

export const transformDoStatement: FunctionVisitor<ts.DoStatement> = (statement, context) => {
    const body = lua.createDoStatement(transformLoopBody(context, statement));
    let condition = context.transformExpression(statement.expression);
    if (lua.isUnaryExpression(condition) && condition.operator === lua.SyntaxKind.NotOperator) {
        condition = condition.operand;
    } else {
        condition = lua.createUnaryExpression(lua.createParenthesizedExpression(condition), lua.SyntaxKind.NotOperator);
    }

    return lua.createRepeatStatement(lua.createBlock([body]), condition, statement);
};
