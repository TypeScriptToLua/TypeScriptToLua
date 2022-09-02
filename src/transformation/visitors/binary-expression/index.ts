import * as ts from "typescript";
import { LuaTarget } from "../../../CompilerOptions";
import * as lua from "../../../LuaAST";
import { FunctionVisitor, TransformationContext } from "../../context";
import { wrapInToStringForConcat } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { canBeFalsyWhenNotNull, isStandardLibraryType, isStringType } from "../../utils/typescript";
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
import { transformOrderedExpressions } from "../expression-list";
import { transformInPrecedingStatementScope } from "../../utils/preceding-statements";

type ShortCircuitOperator =
    | ts.SyntaxKind.AmpersandAmpersandToken
    | ts.SyntaxKind.BarBarToken
    | ts.SyntaxKind.QuestionQuestionToken;

const isShortCircuitOperator = (value: unknown): value is ShortCircuitOperator =>
    value === ts.SyntaxKind.AmpersandAmpersandToken ||
    value === ts.SyntaxKind.BarBarToken ||
    value === ts.SyntaxKind.QuestionQuestionToken;

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

function transformBinaryOperationWithNoPrecedingStatements(
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
        return transformNullishCoalescingOperationNoPrecedingStatements(context, node, left, right);
    }

    if (operator === ts.SyntaxKind.PercentToken && context.luaTarget === LuaTarget.Lua50) {
        return transformLuaLibFunction(context, LuaLibFeature.Modulo50, node, left, right);
    }

    let luaOperator = simpleOperatorsToLua[operator];

    // Check if we need to use string concat operator
    if (operator === ts.SyntaxKind.PlusToken && ts.isBinaryExpression(node)) {
        const typeLeft = context.checker.getTypeAtLocation(node.left);
        const typeRight = context.checker.getTypeAtLocation(node.right);

        const isLeftString = isStringType(context, typeLeft);
        const isRightString = isStringType(context, typeRight);
        if (isLeftString || isRightString) {
            left = isLeftString ? left : wrapInToStringForConcat(left);
            right = isRightString ? right : wrapInToStringForConcat(right);
            luaOperator = lua.SyntaxKind.ConcatOperator;
        }
    }

    return lua.createBinaryExpression(left, right, luaOperator, node);
}

export function createShortCircuitBinaryExpressionPrecedingStatements(
    context: TransformationContext,
    lhs: lua.Expression,
    rhs: lua.Expression,
    rightPrecedingStatements: lua.Statement[],
    operator: ShortCircuitOperator,
    node?: ts.BinaryExpression
): [lua.Statement[], lua.Expression] {
    const conditionIdentifier = context.createTempNameForLuaExpression(lhs);
    const assignmentStatement = lua.createVariableDeclarationStatement(conditionIdentifier, lhs, node?.left);

    let condition: lua.Expression;
    switch (operator) {
        case ts.SyntaxKind.BarBarToken:
            condition = lua.createUnaryExpression(
                lua.cloneIdentifier(conditionIdentifier),
                lua.SyntaxKind.NotOperator,
                node
            );
            break;
        case ts.SyntaxKind.AmpersandAmpersandToken:
            condition = lua.cloneIdentifier(conditionIdentifier);
            break;
        case ts.SyntaxKind.QuestionQuestionToken:
            condition = lua.createBinaryExpression(
                lua.cloneIdentifier(conditionIdentifier),
                lua.createNilLiteral(),
                lua.SyntaxKind.EqualityOperator,
                node
            );
            break;
    }

    const ifStatement = lua.createIfStatement(
        condition,
        lua.createBlock([...rightPrecedingStatements, lua.createAssignmentStatement(conditionIdentifier, rhs)]),
        undefined,
        node?.left
    );
    return [[assignmentStatement, ifStatement], conditionIdentifier];
}

function transformShortCircuitBinaryExpression(
    context: TransformationContext,
    node: ts.BinaryExpression,
    operator: ShortCircuitOperator
): [lua.Statement[], lua.Expression] {
    const lhs = context.transformExpression(node.left);
    const [rightPrecedingStatements, rhs] = transformInPrecedingStatementScope(context, () =>
        context.transformExpression(node.right)
    );
    return transformBinaryOperation(context, lhs, rhs, rightPrecedingStatements, operator, node);
}

export function transformBinaryOperation(
    context: TransformationContext,
    left: lua.Expression,
    right: lua.Expression,
    rightPrecedingStatements: lua.Statement[],
    operator: BitOperator | SimpleOperator | ts.SyntaxKind.QuestionQuestionToken,
    node: ts.Node
): [lua.Statement[], lua.Expression] {
    if (rightPrecedingStatements.length > 0 && isShortCircuitOperator(operator)) {
        assert(ts.isBinaryExpression(node));
        return createShortCircuitBinaryExpressionPrecedingStatements(
            context,
            left,
            right,
            rightPrecedingStatements,
            operator,
            node
        );
    }

    return [
        rightPrecedingStatements,
        transformBinaryOperationWithNoPrecedingStatements(context, left, right, operator, node),
    ];
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

            if (isStandardLibraryType(context, rhsType, "ObjectConstructor")) {
                return transformLuaLibFunction(context, LuaLibFeature.InstanceOfObject, node, lhs);
            }

            return transformLuaLibFunction(context, LuaLibFeature.InstanceOf, node, lhs, rhs);
        }

        case ts.SyntaxKind.CommaToken: {
            const statements = context.transformStatements(ts.factory.createExpressionStatement(node.left));
            const [precedingStatements, result] = transformInPrecedingStatementScope(context, () =>
                context.transformExpression(node.right)
            );
            statements.push(...precedingStatements);
            context.addPrecedingStatements(statements);
            return result;
        }

        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.AmpersandAmpersandToken:
        case ts.SyntaxKind.BarBarToken: {
            const [precedingStatements, result] = transformShortCircuitBinaryExpression(context, node, operator);
            context.addPrecedingStatements(precedingStatements);
            return result;
        }
    }

    let [precedingStatements, [lhs, rhs]] = transformInPrecedingStatementScope(context, () =>
        transformOrderedExpressions(context, [node.left, node.right])
    );
    let result: lua.Expression;
    [precedingStatements, result] = transformBinaryOperation(context, lhs, rhs, precedingStatements, operator, node);
    context.addPrecedingStatements(precedingStatements);
    return result;
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
            ...context.transformStatements(ts.factory.createExpressionStatement(expression.left)),
            ...context.transformStatements(ts.factory.createExpressionStatement(expression.right)),
        ];

        return lua.createDoStatement(statements, expression);
    }
}

function transformNullishCoalescingOperationNoPrecedingStatements(
    context: TransformationContext,
    node: ts.BinaryExpression,
    transformedLeft: lua.Expression,
    transformedRight: lua.Expression
): lua.Expression {
    const lhsType = context.checker.getTypeAtLocation(node.left);

    // Check if we can take a shortcut to 'lhs or rhs' if the left-hand side cannot be 'false'.
    if (canBeFalsyWhenNotNull(context, lhsType)) {
        // reuse logic from case with preceding statements
        const [precedingStatements, result] = createShortCircuitBinaryExpressionPrecedingStatements(
            context,
            transformedLeft,
            transformedRight,
            [],
            ts.SyntaxKind.QuestionQuestionToken,
            node
        );
        context.addPrecedingStatements(precedingStatements);
        return result;
    } else {
        // lhs or rhs
        return lua.createBinaryExpression(transformedLeft, transformedRight, lua.SyntaxKind.OrOperator, node);
    }
}
