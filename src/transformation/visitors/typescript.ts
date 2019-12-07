import * as ts from "typescript";
import { FunctionVisitor, Visitors } from "../context";
import { validateAssignment } from "../utils/assignment-validation";

const transformAssertionExpression: FunctionVisitor<ts.AssertionExpression> = (expression, context) => {
    if (!ts.isConstTypeReference(expression.type)) {
        validateAssignment(
            context,
            expression,
            context.checker.getTypeAtLocation(expression.expression),
            context.checker.getTypeAtLocation(expression.type)
        );
    }

    return context.transformExpression(expression.expression);
};

export const typescriptVisitors: Visitors = {
    [ts.SyntaxKind.TypeAliasDeclaration]: () => undefined,
    [ts.SyntaxKind.InterfaceDeclaration]: () => undefined,

    [ts.SyntaxKind.NonNullExpression]: (node, context) => context.transformExpression(node.expression),
    [ts.SyntaxKind.AsExpression]: transformAssertionExpression,
    [ts.SyntaxKind.TypeAssertionExpression]: transformAssertionExpression,
};
