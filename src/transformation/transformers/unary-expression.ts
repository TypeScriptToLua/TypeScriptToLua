import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../context";
import { UnsupportedKind } from "../utils/errors";
import { transformUnaryBitOperation } from "./binary-expression/bit";
import {
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
} from "./binary-expression/compound";

const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
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

    return context.superTransformStatements(node);
};

const transformPostfixUnaryExpression: FunctionVisitor<ts.PostfixUnaryExpression> = (expression, context) => {
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

const transformPrefixUnaryExpression: FunctionVisitor<ts.PrefixUnaryExpression> = (expression, context) => {
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
            // TODO:
            return context.transformExpression(expression.operand);

        case ts.SyntaxKind.MinusToken:
            return tstl.createUnaryExpression(
                context.transformExpression(expression.operand),
                tstl.SyntaxKind.NegationOperator
            );

        case ts.SyntaxKind.ExclamationToken:
            return tstl.createUnaryExpression(
                context.transformExpression(expression.operand),
                tstl.SyntaxKind.NotOperator
            );

        case ts.SyntaxKind.TildeToken:
            return transformUnaryBitOperation(
                context,
                expression,
                context.transformExpression(expression.operand),
                tstl.SyntaxKind.BitwiseNotOperator
            );

        default:
            throw UnsupportedKind("unary prefix operator", expression.operator, expression);
    }
};

export const unaryExpressionPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ExpressionStatement]: { transform: transformExpressionStatement, priority: 1 },
        [ts.SyntaxKind.PostfixUnaryExpression]: transformPostfixUnaryExpression,
        [ts.SyntaxKind.PrefixUnaryExpression]: transformPrefixUnaryExpression,
    },
};
