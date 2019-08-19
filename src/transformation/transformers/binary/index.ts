import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { TransformationContext, TransformerPlugin, FunctionVisitor } from "../../context";
import { DecoratorKind, getCustomDecorators } from "../../utils/decorators";
import { InvalidInstanceOfExtension, InvalidInstanceOfLuaTable, UnsupportedKind } from "../../utils/errors";
import { createImmediatelyInvokedFunctionExpression, wrapInToStringForConcat } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isStandardLibraryType, isStringType } from "../../utils/typescript";
import { transformAssignmentExpression, transformAssignmentStatement } from "./assignments";
import { transformBinaryBitOperation } from "./bit";
import {
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
    unwrapCompoundAssignmentToken,
    isCompoundAssignmentToken,
} from "./compound";

export function transformBinaryOperator(
    context: TransformationContext,
    node: ts.Node,
    operator: ts.BinaryOperator
): tstl.BinaryOperator {
    switch (operator) {
        // Bitwise operators
        case ts.SyntaxKind.BarToken:
            return tstl.SyntaxKind.BitwiseOrOperator;
        case ts.SyntaxKind.CaretToken:
            return tstl.SyntaxKind.BitwiseExclusiveOrOperator;
        case ts.SyntaxKind.AmpersandToken:
            return tstl.SyntaxKind.BitwiseAndOperator;
        case ts.SyntaxKind.LessThanLessThanToken:
            return tstl.SyntaxKind.BitwiseLeftShiftOperator;
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
            throw UnsupportedKind("right shift operator (use >>> instead)", operator, node);
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            return tstl.SyntaxKind.BitwiseRightShiftOperator;
        // Regular operators
        case ts.SyntaxKind.AmpersandAmpersandToken:
            return tstl.SyntaxKind.AndOperator;
        case ts.SyntaxKind.BarBarToken:
            return tstl.SyntaxKind.OrOperator;
        case ts.SyntaxKind.MinusToken:
            return tstl.SyntaxKind.SubtractionOperator;
        case ts.SyntaxKind.PlusToken:
            if (ts.isBinaryExpression(node)) {
                // Check is we need to use string concat operator
                const typeLeft = context.checker.getTypeAtLocation(node.left);
                const typeRight = context.checker.getTypeAtLocation(node.right);
                if (isStringType(context, typeLeft) || isStringType(context, typeRight)) {
                    return tstl.SyntaxKind.ConcatOperator;
                }
            }

            return tstl.SyntaxKind.AdditionOperator;
        case ts.SyntaxKind.AsteriskToken:
            return tstl.SyntaxKind.MultiplicationOperator;
        case ts.SyntaxKind.AsteriskAsteriskToken:
            return tstl.SyntaxKind.PowerOperator;
        case ts.SyntaxKind.SlashToken:
            return tstl.SyntaxKind.DivisionOperator;
        case ts.SyntaxKind.PercentToken:
            return tstl.SyntaxKind.ModuloOperator;
        case ts.SyntaxKind.GreaterThanToken:
            return tstl.SyntaxKind.GreaterThanOperator;
        case ts.SyntaxKind.GreaterThanEqualsToken:
            return tstl.SyntaxKind.GreaterEqualOperator;
        case ts.SyntaxKind.LessThanToken:
            return tstl.SyntaxKind.LessThanOperator;
        case ts.SyntaxKind.LessThanEqualsToken:
            return tstl.SyntaxKind.LessEqualOperator;
        case ts.SyntaxKind.EqualsEqualsToken:
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
            return tstl.SyntaxKind.EqualityOperator;
        case ts.SyntaxKind.ExclamationEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
            return tstl.SyntaxKind.InequalityOperator;
        default:
            throw UnsupportedKind("binary operator", operator, node);
    }
}

export function transformBinaryOperation(
    context: TransformationContext,
    left: tstl.Expression,
    right: tstl.Expression,
    operator: ts.BinaryOperator,
    tsOriginal: ts.Node
): tstl.Expression {
    switch (operator) {
        case ts.SyntaxKind.AmpersandToken:
        case ts.SyntaxKind.BarToken:
        case ts.SyntaxKind.CaretToken:
        case ts.SyntaxKind.LessThanLessThanToken:
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            return transformBinaryBitOperation(context, tsOriginal, left, right, operator);
        default:
            const luaOperator = transformBinaryOperator(context, tsOriginal, operator);
            if (luaOperator === tstl.SyntaxKind.ConcatOperator) {
                left = wrapInToStringForConcat(left);
                right = wrapInToStringForConcat(right);
            }

            return tstl.createBinaryExpression(left, right, luaOperator, tsOriginal);
    }
}

const transformBinaryExpression: FunctionVisitor<ts.BinaryExpression> = (node, context) => {
    const operator = node.operatorToken.kind;

    // Check if this is an assignment token, then handle accordingly
    if (isCompoundAssignmentToken(operator)) {
        return transformCompoundAssignmentExpression(
            context,
            node,
            node.left,
            node.right,
            unwrapCompoundAssignmentToken(operator),
            false
        );
    }

    // Transpile operators
    switch (operator) {
        case ts.SyntaxKind.AmpersandToken:
        case ts.SyntaxKind.BarToken:
        case ts.SyntaxKind.CaretToken:
        case ts.SyntaxKind.LessThanLessThanToken:
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
        case ts.SyntaxKind.PlusToken:
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.MinusToken:
        case ts.SyntaxKind.AsteriskToken:
        case ts.SyntaxKind.AsteriskAsteriskToken:
        case ts.SyntaxKind.SlashToken:
        case ts.SyntaxKind.PercentToken:

        case ts.SyntaxKind.GreaterThanToken:
        case ts.SyntaxKind.GreaterThanEqualsToken:
        case ts.SyntaxKind.LessThanToken:
        case ts.SyntaxKind.LessThanEqualsToken:
        case ts.SyntaxKind.EqualsEqualsToken:
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
            return transformBinaryOperation(
                context,
                context.transformExpression(node.left),
                context.transformExpression(node.right),
                operator,
                node
            );

        case ts.SyntaxKind.EqualsToken:
            return transformAssignmentExpression(context, node as ts.AssignmentExpression<ts.EqualsToken>);

        case ts.SyntaxKind.InKeyword: {
            const lhs = context.transformExpression(node.left);
            const rhs = context.transformExpression(node.right);
            const indexExpression = tstl.createTableIndexExpression(rhs, lhs);
            return tstl.createBinaryExpression(
                indexExpression,
                tstl.createNilLiteral(),
                tstl.SyntaxKind.InequalityOperator,
                node
            );
        }

        case ts.SyntaxKind.InstanceOfKeyword: {
            const lhs = context.transformExpression(node.left);
            const rhs = context.transformExpression(node.right);
            const rhsType = context.checker.getTypeAtLocation(node.right);
            const decorators = getCustomDecorators(context, rhsType);

            if (decorators.has(DecoratorKind.Extension) || decorators.has(DecoratorKind.MetaExtension)) {
                // Cannot use instanceof on extension classes
                throw InvalidInstanceOfExtension(node);
            }

            if (decorators.has(DecoratorKind.LuaTable)) {
                throw InvalidInstanceOfLuaTable(node);
            }

            if (isStandardLibraryType(context, rhsType, "ObjectConstructor")) {
                return transformLuaLibFunction(context, LuaLibFeature.InstanceOfObject, node, lhs);
            }

            return transformLuaLibFunction(context, LuaLibFeature.InstanceOf, node, lhs, rhs);
        }

        case ts.SyntaxKind.CommaToken: {
            const rhs = context.transformExpression(node.right);
            return createImmediatelyInvokedFunctionExpression(
                context.transformStatements(ts.createExpressionStatement(node.left)),
                rhs,
                node
            );
        }

        default:
            throw UnsupportedKind("binary operator", operator, node);
    }
};

const transformExpressionStatement: FunctionVisitor<ts.ExpressionStatement> = (node, context) => {
    const { expression } = node;
    if (ts.isBinaryExpression(expression)) {
        const operator = expression.operatorToken.kind;

        if (isCompoundAssignmentToken(operator)) {
            // +=, -=, etc...
            return transformCompoundAssignmentStatement(
                context,
                expression,
                expression.left,
                expression.right,
                unwrapCompoundAssignmentToken(operator)
            );
        } else if (operator === ts.SyntaxKind.EqualsToken) {
            return transformAssignmentStatement(context, expression as ts.AssignmentExpression<ts.EqualsToken>);
        } else if (operator === ts.SyntaxKind.CommaToken) {
            const statements = [
                ...context.transformStatements(ts.createExpressionStatement(expression.left)),
                ...context.transformStatements(ts.createExpressionStatement(expression.right)),
            ];

            return tstl.createDoStatement(statements, expression);
        }
    }

    return context.superTransformStatements(node);
};

export const binaryPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.BinaryExpression]: transformBinaryExpression,
        [ts.SyntaxKind.ExpressionStatement]: { priority: 1, transform: transformExpressionStatement },
    },
};
