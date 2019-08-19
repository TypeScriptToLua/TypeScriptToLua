import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../context";

const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    const result = context.transformExpression(expression);
    return tstl.isCallExpression(result) || tstl.isMethodCallExpression(result)
        ? tstl.createExpressionStatement(result)
        : // Assign expression statements to dummy to make sure they're legal Lua
          tstl.createVariableDeclarationStatement(tstl.createAnonymousIdentifier(), result);
};

export const expressionStatementPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ExpressionStatement]: transformExpressionStatement,
    },
};
