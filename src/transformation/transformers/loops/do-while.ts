import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../../context";
import { transformLoopBody } from "./body";

const transformWhileStatement: FunctionVisitor<ts.WhileStatement> = (statement, context) => {
    return tstl.createWhileStatement(
        tstl.createBlock(transformLoopBody(context, statement)),
        context.transformExpression(statement.expression),
        statement
    );
};

const transformDoStatement: FunctionVisitor<ts.DoStatement> = (statement, context) => {
    const body = tstl.createDoStatement(transformLoopBody(context, statement));
    let condition = context.transformExpression(statement.expression);
    if (tstl.isUnaryExpression(condition) && condition.operator === tstl.SyntaxKind.NotOperator) {
        condition = condition.operand;
    } else {
        condition = tstl.createUnaryExpression(
            tstl.createParenthesizedExpression(condition),
            tstl.SyntaxKind.NotOperator
        );
    }

    return tstl.createRepeatStatement(tstl.createBlock([body]), condition, statement);
};

export const doWhilePlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.WhileStatement]: transformWhileStatement,
        [ts.SyntaxKind.DoStatement]: transformDoStatement,
    },
};
