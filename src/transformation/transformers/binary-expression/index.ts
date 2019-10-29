import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import { InvalidInstanceOfExtension, InvalidInstanceOfLuaTable, UnsupportedKind } from "../../utils/errors";
import { createImmediatelyInvokedFunctionExpression, wrapInToStringForConcat } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isStandardLibraryType, isStringType } from "../../utils/typescript";
import { transformTypeOfBinaryExpression } from "../typeof";
import { transformAssignmentExpression, transformAssignmentStatement } from "./assignments";
import { transformBinaryBitOperation } from "./bit";
import {
    isCompoundAssignmentToken,
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
    unwrapCompoundAssignmentToken,
} from "./compound";

export function transformBinaryOperator(
    context: TransformationContext,
    node: ts.Node,
    operator: ts.BinaryOperator
): lua.BinaryOperator {
    switch (operator) {
        // Bitwise operators
        case ts.SyntaxKind.BarToken:
            return lua.SyntaxKind.BitwiseOrOperator;
        case ts.SyntaxKind.CaretToken:
            return lua.SyntaxKind.BitwiseExclusiveOrOperator;
        case ts.SyntaxKind.AmpersandToken:
            return lua.SyntaxKind.BitwiseAndOperator;
        case ts.SyntaxKind.LessThanLessThanToken:
            return lua.SyntaxKind.BitwiseLeftShiftOperator;
        case ts.SyntaxKind.GreaterThanGreaterThanToken:
            throw UnsupportedKind("right shift operator (use >>> instead)", operator, node);
        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            return lua.SyntaxKind.BitwiseRightShiftOperator;
        // Regular operators
        case ts.SyntaxKind.AmpersandAmpersandToken:
            return lua.SyntaxKind.AndOperator;
        case ts.SyntaxKind.BarBarToken:
            return lua.SyntaxKind.OrOperator;
        case ts.SyntaxKind.MinusToken:
            return lua.SyntaxKind.SubtractionOperator;
        case ts.SyntaxKind.PlusToken:
            if (ts.isBinaryExpression(node)) {
                // Check is we need to use string concat operator
                const typeLeft = context.checker.getTypeAtLocation(node.left);
                const typeRight = context.checker.getTypeAtLocation(node.right);
                if (isStringType(context, typeLeft) || isStringType(context, typeRight)) {
                    return lua.SyntaxKind.ConcatOperator;
                }
            }

            return lua.SyntaxKind.AdditionOperator;
        case ts.SyntaxKind.AsteriskToken:
            return lua.SyntaxKind.MultiplicationOperator;
        case ts.SyntaxKind.AsteriskAsteriskToken:
            return lua.SyntaxKind.PowerOperator;
        case ts.SyntaxKind.SlashToken:
            return lua.SyntaxKind.DivisionOperator;
        case ts.SyntaxKind.PercentToken:
            return lua.SyntaxKind.ModuloOperator;
        case ts.SyntaxKind.GreaterThanToken:
            return lua.SyntaxKind.GreaterThanOperator;
        case ts.SyntaxKind.GreaterThanEqualsToken:
            return lua.SyntaxKind.GreaterEqualOperator;
        case ts.SyntaxKind.LessThanToken:
            return lua.SyntaxKind.LessThanOperator;
        case ts.SyntaxKind.LessThanEqualsToken:
            return lua.SyntaxKind.LessEqualOperator;
        case ts.SyntaxKind.EqualsEqualsToken:
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
            return lua.SyntaxKind.EqualityOperator;
        case ts.SyntaxKind.ExclamationEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
            return lua.SyntaxKind.InequalityOperator;
        default:
            throw UnsupportedKind("binary operator", operator, node);
    }
}

export function transformBinaryOperation(
    context: TransformationContext,
    left: lua.Expression,
    right: lua.Expression,
    operator: ts.BinaryOperator,
    tsOriginal: ts.Node
): lua.Expression {
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
            if (luaOperator === lua.SyntaxKind.ConcatOperator) {
                left = wrapInToStringForConcat(left);
                right = wrapInToStringForConcat(right);
            }

            return lua.createBinaryExpression(left, right, luaOperator, tsOriginal);
    }
}

export const transformBinaryExpression: FunctionVisitor<ts.BinaryExpression> = (node, context) => {
    const typeOfResult = transformTypeOfBinaryExpression(context, node);
    if (typeOfResult) {
        return typeOfResult;
    }

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
            const indexExpression = lua.createTableIndexExpression(rhs, lhs);
            return lua.createBinaryExpression(
                indexExpression,
                lua.createNilLiteral(),
                lua.SyntaxKind.InequalityOperator,
                node
            );
        }

        case ts.SyntaxKind.InstanceOfKeyword: {
            const lhs = context.transformExpression(node.left);
            const rhs = context.transformExpression(node.right);
            const rhsType = context.checker.getTypeAtLocation(node.right);
            const annotations = getTypeAnnotations(context, rhsType);

            if (annotations.has(AnnotationKind.Extension) || annotations.has(AnnotationKind.MetaExtension)) {
                // Cannot use instanceof on extension classes
                throw InvalidInstanceOfExtension(node);
            }

            if (annotations.has(AnnotationKind.LuaTable)) {
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

export function transformBinaryExpressionStatement(
    context: TransformationContext,
    node: ts.ExpressionStatement
): lua.Statement[] | lua.Statement | undefined {
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

            return lua.createDoStatement(statements, expression);
        }
    }
}
