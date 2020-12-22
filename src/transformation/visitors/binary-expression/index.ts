import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { AnnotationKind, getTypeAnnotations } from "../../utils/annotations";
import { extensionInvalidInstanceOf, luaTableInvalidInstanceOf } from "../../utils/diagnostics";
import { createImmediatelyInvokedFunctionExpression, wrapInToStringForConcat } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isStandardLibraryType, isStringType, typeCanSatisfy } from "../../utils/typescript";
import { transformTypeOfBinaryExpression } from "../typeof";
import { transformAssignmentExpression, transformAssignmentStatement } from "./assignments";
import { BitOperator, isBitOperator, transformBinaryBitOperation } from "./bit";
import {
    isCompoundAssignmentToken,
    transformCompoundAssignmentExpression,
    transformCompoundAssignmentStatement,
    unwrapCompoundAssignmentToken,
} from "./compound";
import { assert } from "../../../utils";

type SimpleOperator =
    | ts.AdditiveOperatorOrHigher
    | Exclude<ts.RelationalOperator, ts.SyntaxKind.InstanceOfKeyword | ts.SyntaxKind.InKeyword>
    | ts.EqualityOperator
    | ts.LogicalOperator;

const simpleOperatorsToLua: Record<SimpleOperator, lua.BinaryOperator> = {
    [ts.SyntaxKind.AmpersandAmpersandToken]: lua.SyntaxKind.AndOperator,
    [ts.SyntaxKind.BarBarToken]: lua.SyntaxKind.OrOperator,
    [ts.SyntaxKind.PlusToken]: lua.SyntaxKind.AdditionOperator,
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
    operator: BitOperator | SimpleOperator | ts.SyntaxKind.QuestionQuestionToken,
    node: ts.Node
): lua.Expression {
    if (isBitOperator(operator)) {
        return transformBinaryBitOperation(context, node, left, right, operator);
    }

    if (operator === ts.SyntaxKind.QuestionQuestionToken) {
        assert(ts.isBinaryExpression(node));
        return transformNullishCoalescingExpression(context, node);
    }

    let luaOperator = simpleOperatorsToLua[operator];

    // Check if we need to use string concat operator
    if (operator === ts.SyntaxKind.PlusToken && ts.isBinaryExpression(node)) {
        const typeLeft = context.checker.getTypeAtLocation(node.left);
        const typeRight = context.checker.getTypeAtLocation(node.right);
        if (isStringType(context, typeLeft) || isStringType(context, typeRight)) {
            left = wrapInToStringForConcat(left);
            right = wrapInToStringForConcat(right);
            luaOperator = lua.SyntaxKind.ConcatOperator;
        }
    }

    return lua.createBinaryExpression(left, right, luaOperator, node);
}

export const transformBinaryExpression: FunctionVisitor<ts.BinaryExpression> = (node, context) => {
    const operator = node.operatorToken.kind;

    const typeOfResult = transformTypeOfBinaryExpression(context, node);
    if (typeOfResult) {
        return typeOfResult;
    }

    if (isCompoundAssignmentToken(operator)) {
        const token = unwrapCompoundAssignmentToken(operator);
        return transformCompoundAssignmentExpression(context, node, node.left, node.right, token, false);
    }

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
            const annotations = getTypeAnnotations(rhsType);

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
    const expression = node.expression;
    if (!ts.isBinaryExpression(expression)) return;
    const operator = expression.operatorToken.kind;

    if (isCompoundAssignmentToken(operator)) {
        // +=, -=, etc...
        const token = unwrapCompoundAssignmentToken(operator);
        return transformCompoundAssignmentStatement(context, expression, expression.left, expression.right, token);
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

function transformNullishCoalescingExpression(
    context: TransformationContext,
    node: ts.BinaryExpression
): lua.Expression {
    const lhsType = context.checker.getTypeAtLocation(node.left);

    // Check if we can take a shortcut to 'lhs or rhs' if the left-hand side cannot be 'false'.
    const typeCanBeFalse = (type: ts.Type) =>
        (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Boolean)) !== 0 ||
        (type.flags & ts.TypeFlags.BooleanLiteral & ts.TypeFlags.PossiblyFalsy) !== 0;
    if (typeCanSatisfy(context, lhsType, typeCanBeFalse)) {
        // lhs can be false, transform to IIFE
        const lhsIdentifier = lua.createIdentifier("____lhs");
        const nilComparison = lua.createBinaryExpression(
            lua.cloneIdentifier(lhsIdentifier),
            lua.createNilLiteral(),
            lua.SyntaxKind.EqualityOperator
        );
        // if ____ == nil then return rhs else return ____ end
        const ifStatement = lua.createIfStatement(
            nilComparison,
            lua.createBlock([lua.createReturnStatement([context.transformExpression(node.right)])]),
            lua.createBlock([lua.createReturnStatement([lua.cloneIdentifier(lhsIdentifier)])])
        );
        // (function(lhs') if lhs' == nil then return rhs else return lhs' end)(lhs)
        return lua.createCallExpression(lua.createFunctionExpression(lua.createBlock([ifStatement]), [lhsIdentifier]), [
            context.transformExpression(node.left),
        ]);
    } else {
        // lhs or rhs
        return lua.createBinaryExpression(
            context.transformExpression(node.left),
            context.transformExpression(node.right),
            lua.SyntaxKind.OrOperator,
            node
        );
    }
}
