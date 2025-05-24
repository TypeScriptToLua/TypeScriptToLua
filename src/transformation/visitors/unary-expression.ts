import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { assertNever } from "../../utils";
import { FunctionVisitor, TransformationContext } from "../context";
import { transformUnaryBitOperation } from "./binary-expression/bit";
import {
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
} from "./binary-expression/compound";
import { isNumberType } from "../utils/typescript";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

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
            ts.factory.createNumericLiteral(1),
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
            ts.factory.createNumericLiteral(1),
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
                ts.factory.createNumericLiteral(1),
                ts.SyntaxKind.PlusToken,
                true
            );

        case ts.SyntaxKind.MinusMinusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.factory.createNumericLiteral(1),
                ts.SyntaxKind.MinusToken,
                true
            );

        default:
            assertNever(expression.operator);
    }
};

export const transformPrefixUnaryExpression: FunctionVisitor<ts.PrefixUnaryExpression> = (expression, context) => {
    switch (expression.operator) {
        case ts.SyntaxKind.PlusPlusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.factory.createNumericLiteral(1),
                ts.SyntaxKind.PlusToken,
                false
            );

        case ts.SyntaxKind.MinusMinusToken:
            return transformCompoundAssignmentExpression(
                context,
                expression,
                expression.operand,
                ts.factory.createNumericLiteral(1),
                ts.SyntaxKind.MinusToken,
                false
            );

        case ts.SyntaxKind.PlusToken: {
            const operand = context.transformExpression(expression.operand);
            const type = context.checker.getTypeAtLocation(expression.operand);
            if (isNumberType(context, type)) {
                return operand;
            } else {
                return transformLuaLibFunction(context, LuaLibFeature.Number, expression, operand);
            }
        }
        case ts.SyntaxKind.MinusToken: {
            const operand = context.transformExpression(expression.operand);
            const type = context.checker.getTypeAtLocation(expression.operand);
            if (isNumberType(context, type)) {
                return lua.createUnaryExpression(operand, lua.SyntaxKind.NegationOperator);
            } else {
                return transformLuaLibFunction(
                    context,
                    LuaLibFeature.Number,
                    expression,
                    lua.createUnaryExpression(operand, lua.SyntaxKind.NegationOperator)
                );
            }
        }
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
            assertNever(expression.operator);
    }
};
