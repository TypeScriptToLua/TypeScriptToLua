import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, Visitors } from "../context";
import { validateAssignment } from "../utils/assignment-validation";
import { isInDestructingAssignment } from "../utils/typescript";

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

function isWithinLiteralAssignmentStatement(node: ts.Node): boolean {
    if (!node.parent) {
        return false;
    }

    if (
        ts.isArrayLiteralExpression(node.parent) ||
        ts.isArrayBindingPattern(node.parent) ||
        ts.isObjectLiteralExpression(node.parent)
    ) {
        return isWithinLiteralAssignmentStatement(node.parent);
    } else if (isInDestructingAssignment(node)) {
        return true;
    } else if (ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        return true;
    } else {
        return false;
    }
}

// TODO: Consider handling without a visitor since it depends on context too much
const transformOmittedExpression: FunctionVisitor<ts.OmittedExpression> = node => {
    const isWithinBindingAssignmentStatement = isWithinLiteralAssignmentStatement(node);
    return isWithinBindingAssignmentStatement ? tstl.createAnonymousIdentifier() : tstl.createNilLiteral(node);
};

export const todoMoveSomewhereVisitors: Visitors = {
    [ts.SyntaxKind.EmptyStatement]: () => undefined,
    [ts.SyntaxKind.OmittedExpression]: transformOmittedExpression,

    [ts.SyntaxKind.TypeAliasDeclaration]: () => undefined,
    [ts.SyntaxKind.InterfaceDeclaration]: () => undefined,

    [ts.SyntaxKind.NonNullExpression]: (node, context) => context.transformExpression(node.expression),
    [ts.SyntaxKind.AsExpression]: transformAssertionExpression,
    [ts.SyntaxKind.TypeAssertionExpression]: transformAssertionExpression,

    [ts.SyntaxKind.ParenthesizedExpression]: (node, context) =>
        tstl.createParenthesizedExpression(context.transformExpression(node.expression), node),
};
