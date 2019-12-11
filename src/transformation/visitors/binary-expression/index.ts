import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { assertNever } from "../../../utils";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import {
    extensionInvalidInstanceOf,
    luaTableInvalidInstanceOf,
    unsupportedNullishCoalescing,
} from "../../utils/diagnostics";
import { createImmediatelyInvokedFunctionExpression, wrapInToStringForConcat } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isStandardLibraryType, isStringType } from "../../utils/typescript";
import { transformTypeOfBinaryExpression } from "../typeof";
import { transformAssignmentExpression, transformAssignmentStatement } from "./assignments";
import { BitOperator, isBitOperator, transformBinaryBitOperation } from "./bit";
import {
    isCompoundAssignmentToken,
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
    unwrapCompoundAssignmentToken,
} from "./compound";

type SimpleOperator = keyof typeof simpleOperatorsToLua;
const isSimpleOperator = (operator: ts.BinaryOperator): operator is SimpleOperator => operator in simpleOperatorsToLua;

const simpleOperatorsToLua = {
    [ts.SyntaxKind.AmpersandAmpersandToken]: lua.SyntaxKind.AndOperator,
    [ts.SyntaxKind.BarBarToken]: lua.SyntaxKind.OrOperator,
    [ts.SyntaxKind.MinusToken]: lua.SyntaxKind.SubtractionOperator,
    [ts.SyntaxKind.AsteriskToken]: lua.SyntaxKind.MultiplicationOperator,
    [ts.SyntaxKind.AsteriskAsteriskToken]: lua.SyntaxKind.PowerOperator,
    [ts.SyntaxKind.SlashToken]: lua.SyntaxKind.DivisionOperator,
    [ts.SyntaxKind.PercentToken]: lua.SyntaxKind.ModuloOperator,
    [ts.SyntaxKind.GreaterThanToken]: lua.SyntaxKind.GreaterThanOperator,
    [ts.SyntaxKind.GreaterThanEqualsToken]: lua.SyntaxKind.GreaterEqualOperator,
    [ts.SyntaxKind.LessThanToken]: lua.SyntaxKind.LessThanOperator,
    [ts.SyntaxKind.LessThanEqualsToken]: lua.SyntaxKind.LessEqualOperator,
    [ts.SyntaxKind.EqualsEqualsToken]: lua.SyntaxKind.EqualityOperator,
    [ts.SyntaxKind.EqualsEqualsEqualsToken]: lua.SyntaxKind.EqualityOperator,
    [ts.SyntaxKind.ExclamationEqualsToken]: lua.SyntaxKind.InequalityOperator,
    [ts.SyntaxKind.ExclamationEqualsEqualsToken]: lua.SyntaxKind.InequalityOperator,
};

export function transformBinaryOperation(
    context: TransformationContext,
    left: lua.Expression,
    right: lua.Expression,
    operator: BitOperator | SimpleOperator | ts.SyntaxKind.PlusToken,
    node: ts.Node
): lua.Expression {
    if (isBitOperator(operator)) {
        return transformBinaryBitOperation(context, node, left, right, operator);
    }

    if (isSimpleOperator(operator)) {
        const luaOperator = simpleOperatorsToLua[operator] as lua.BinaryOperator;
        return lua.createBinaryExpression(left, right, luaOperator, node);
    }

    if (operator === ts.SyntaxKind.PlusToken) {
        let luaOperator = lua.SyntaxKind.AdditionOperator;
        if (ts.isBinaryExpression(node)) {
            // Check is we need to use string concat operator
            const typeLeft = context.checker.getTypeAtLocation(node.left);
            const typeRight = context.checker.getTypeAtLocation(node.right);
            if (isStringType(context, typeLeft) || isStringType(context, typeRight)) {
                luaOperator = lua.SyntaxKind.ConcatOperator;
                left = wrapInToStringForConcat(left);
                right = wrapInToStringForConcat(right);
            }
        }

        return lua.createBinaryExpression(left, right, luaOperator, node);
    }

    assertNever(operator);
}

export const transformBinaryExpression: FunctionVisitor<ts.BinaryExpression> = (node, context) => {
    const operator = node.operatorToken.kind;

    const typeOfResult = transformTypeOfBinaryExpression(context, node);
    if (typeOfResult) {
        return typeOfResult;
    }

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
                context.diagnostics.push(extensionInvalidInstanceOf(node));
            }

            if (annotations.has(AnnotationKind.LuaTable)) {
                context.diagnostics.push(luaTableInvalidInstanceOf(node));
            }

            if (isStandardLibraryType(context, rhsType, "ObjectConstructor")) {
                return transformLuaLibFunction(context, LuaLibFeature.InstanceOfObject, node, lhs);
            }

            return transformLuaLibFunction(context, LuaLibFeature.InstanceOf, node, lhs, rhs);
        }

        case ts.SyntaxKind.CommaToken: {
            return createImmediatelyInvokedFunctionExpression(
                context.transformStatements(ts.createExpressionStatement(node.left)),
                context.transformExpression(node.right),
                node
            );
        }

        case ts.SyntaxKind.QuestionQuestionToken: {
            context.diagnostics.push(unsupportedNullishCoalescing(node.operatorToken));
            return lua.createBinaryExpression(
                context.transformExpression(node.left),
                context.transformExpression(node.right),
                lua.SyntaxKind.OrOperator,
                node
            );
        }

        default:
            return transformBinaryOperation(
                context,
                context.transformExpression(node.left),
                context.transformExpression(node.right),
                operator,
                node
            );
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
