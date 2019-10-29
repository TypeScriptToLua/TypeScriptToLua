import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { cast } from "../../utils";
import { FunctionVisitor, TransformationContext } from "../context";
import { createImmediatelyInvokedFunctionExpression } from "../utils/lua-ast";

export const transformDeleteExpression: FunctionVisitor<ts.DeleteExpression> = (node, context) => {
    const lhs = cast(context.transformExpression(node.expression), lua.isAssignmentLeftHandSideExpression);
    const assignment = lua.createAssignmentStatement(lhs, lua.createNilLiteral(), node);
    return createImmediatelyInvokedFunctionExpression([assignment], [lua.createBooleanLiteral(true)], node);
};

export function transformDeleteExpressionStatement(
    context: TransformationContext,
    node: ts.ExpressionStatement
): lua.Statement | undefined {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    if (ts.isDeleteExpression(expression)) {
        return lua.createAssignmentStatement(
            cast(context.transformExpression(expression.expression), lua.isAssignmentLeftHandSideExpression),
            lua.createNilLiteral(),
            expression
        );
    }
}
