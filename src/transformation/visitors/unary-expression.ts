import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../context";
import { UnsupportedKind } from "../utils/errors";
import { transformUnaryBitOperation } from "./binary-expression/bit";
import {
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
} from "./binary-expression/compound";

export function transformUnaryExpressionStatement(
    context: TransformationContext,
    node: ts.ExpressionStatement
): lua.Statement[] | undefined {
    const expression = ts.isExpressionStatement(node) ? node.expression : node;
    if (
        ts.isPrefixUnaryExpression(expression) &&
        (expression.operator === ts.SyntaxKind.PlusPlusToken || expression.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
        // ++i, --i
        const replacementOperator =
            expression.operator === ts.SyntaxKind.PlusPlusToken ? ts.SyntaxKind.PlusToken : ts.SyntaxKind.MinusToken;

        return transformCompoundAssignmentStatement(
            context,
            expression,
            expression.operand,
            ts.createLiteral(1),
            replacementOperator
        );
    } else if (ts.isPostfixUnaryExpression(expression)) {
        // i++, i--
        const replacementOperator =
            expression.operator === ts.SyntaxKind.PlusPlusToken ? ts.SyntaxKind.PlusToken : ts.SyntaxKind.MinusToken;

        return transformCompoundAssignmentStatement(
            context,
            expression,
            expression.operand,
            ts.createLiteral(1),
            replacementOperator
        );
    }
}

export const transformPostfixUnaryExpression: FunctionVisitor<ts.PostfixUnaryExpression> = (expression, context) => {
    switch (expression.operator) {
        case ts.SyntaxKind.PlusPlusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.createLiteral(1),
                ts.SyntaxKind.PlusToken,
                true
            );

        case ts.SyntaxKind.MinusMinusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.createLiteral(1),
                ts.SyntaxKind.MinusToken,
                true
            );

        default:
            throw UnsupportedKind("unary postfix operator", expression.operator, expression);
    }
};

export const transformPrefixUnaryExpression: FunctionVisitor<ts.PrefixUnaryExpression> = (expression, context) => {
    switch (expression.operator) {
        case ts.SyntaxKind.PlusPlusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.createLiteral(1),
                ts.SyntaxKind.PlusToken,
                false
            );

        case ts.SyntaxKind.MinusMinusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.createLiteral(1),
                ts.SyntaxKind.MinusToken,
                false
            );

        case ts.SyntaxKind.PlusToken:
            // TODO: Wrap with `Number`
            return context.transformExpression(expression.operand);

        case ts.SyntaxKind.MinusToken:
            return lua.createUnaryExpression(
                context.transformExpression(expression.operand),
                lua.SyntaxKind.NegationOperator
            );

        case ts.SyntaxKind.ExclamationToken:
            return lua.createUnaryExpression(
                context.transformExpression(expression.operand),
                lua.SyntaxKind.NotOperator
            );

        case ts.SyntaxKind.TildeToken:
            return transformUnaryBitOperation(
                context,
                expression,
                context.transformExpression(expression.operand),
                lua.SyntaxKind.BitwiseNotOperator
            );

        default:
            throw UnsupportedKind("unary prefix operator", expression.operator, expression);
    }
};
