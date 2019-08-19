import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { cast } from "../../utils";
import { FunctionVisitor, TransformerPlugin } from "../context";
import { createImmediatelyInvokedFunctionExpression } from "../utils/lua-ast";

const transformDeleteExpression: FunctionVisitor<ts.DeleteExpression> = (node, context) => {
    const lhs = cast(context.transformExpression(node.expression), tstl.isAssignmentLeftHandSideExpression);
    const assignment = tstl.createAssignmentStatement(lhs, tstl.createNilLiteral(), node);
    return createImmediatelyInvokedFunctionExpression([assignment], [tstl.createBooleanLiteral(true)], node);
};

const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    if (ts.isDeleteExpression(expression)) {
        return tstl.createAssignmentStatement(
            cast(context.transformExpression(expression.expression), tstl.isAssignmentLeftHandSideExpression),
            tstl.createNilLiteral(),
            expression
        );
    }

    return context.superTransformStatements(node);
};

export const deletePlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.DeleteExpression]: transformDeleteExpression,
        [ts.SyntaxKind.ExpressionStatement]: { transform: transformExpressionStatement, priority: 1 },
    },
};
