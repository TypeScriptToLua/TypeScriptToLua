import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { cast } from "../../utils";
import { FunctionVisitor, TransformationContext } from "../context";
import { createImmediatelyInvokedFunctionExpression } from "../utils/lua-ast";

export const transformDeleteExpression: FunctionVisitor<ts.DeleteExpression> = (node, context) => {
    const lhs = cast(context.transformExpression(node.expression), tstl.isAssignmentLeftHandSideExpression);
    const assignment = tstl.createAssignmentStatement(lhs, tstl.createNilLiteral(), node);
    return createImmediatelyInvokedFunctionExpression([assignment], [tstl.createBooleanLiteral(true)], node);
};

export function transformDeleteExpressionStatement(
    context: TransformationContext,
    node: ts.ExpressionStatement
): tstl.Statement | undefined {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    if (ts.isDeleteExpression(expression)) {
        return tstl.createAssignmentStatement(
            cast(context.transformExpression(expression.expression), tstl.isAssignmentLeftHandSideExpression),
            tstl.createNilLiteral(),
            expression
        );
    }
}
