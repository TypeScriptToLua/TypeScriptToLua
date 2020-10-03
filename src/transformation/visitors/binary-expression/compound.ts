import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast, assertNever } from "../../../utils";
import { TransformationContext } from "../../context";
import { createImmediatelyInvokedFunctionExpression } from "../../utils/lua-ast";
import { isArrayType, isExpressionWithEvaluationEffect } from "../../utils/typescript";
import { transformBinaryOperation } from "../binary-expression";
import { transformAssignment } from "./assignments";

// If expression is property/element access with possible effects from being evaluated, returns separated object and index expressions.
export function parseAccessExpressionWithEvaluationEffects(
    context: TransformationContext,
    node: ts.Expression
): [ts.Expression, ts.Expression] | [] {
    if (
        ts.isElementAccessExpression(node) &&
        (isExpressionWithEvaluationEffect(node.expression) || isExpressionWithEvaluationEffect(node.argumentExpression))
    ) {
        const type = context.checker.getTypeAtLocation(node.expression);
        if (isArrayType(context, type)) {
            // Offset arrays by one
            const oneLit = ts.createNumericLiteral("1");
            const exp = ts.createParen(node.argumentExpression);
            const addExp = ts.createBinary(exp, ts.SyntaxKind.PlusToken, oneLit);
            return [node.expression, addExp];
        } else {
            return [node.expression, node.argumentExpression];
        }
    } else if (ts.isPropertyAccessExpression(node) && isExpressionWithEvaluationEffect(node.expression)) {
        return [node.expression, ts.createStringLiteral(node.name.text)];
    }

    return [];
}

// TODO: `as const` doesn't work on enum members
type CompoundAssignmentToken =
    | ts.SyntaxKind.BarToken
    | ts.SyntaxKind.PlusToken
    | ts.SyntaxKind.CaretToken
    | ts.SyntaxKind.MinusToken
    | ts.SyntaxKind.SlashToken
    | ts.SyntaxKind.PercentToken
    | ts.SyntaxKind.AsteriskToken
    | ts.SyntaxKind.AmpersandToken
    | ts.SyntaxKind.AsteriskAsteriskToken
    | ts.SyntaxKind.LessThanLessThanToken
    | ts.SyntaxKind.GreaterThanGreaterThanToken
    | ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken
    | ts.SyntaxKind.BarBarToken
    | ts.SyntaxKind.AmpersandAmpersandToken
    | ts.SyntaxKind.QuestionQuestionToken;

const compoundToAssignmentTokens: Record<ts.CompoundAssignmentOperator, CompoundAssignmentToken> = {
    [ts.SyntaxKind.BarEqualsToken]: ts.SyntaxKind.BarToken,
    [ts.SyntaxKind.PlusEqualsToken]: ts.SyntaxKind.PlusToken,
    [ts.SyntaxKind.CaretEqualsToken]: ts.SyntaxKind.CaretToken,
    [ts.SyntaxKind.MinusEqualsToken]: ts.SyntaxKind.MinusToken,
    [ts.SyntaxKind.SlashEqualsToken]: ts.SyntaxKind.SlashToken,
    [ts.SyntaxKind.PercentEqualsToken]: ts.SyntaxKind.PercentToken,
    [ts.SyntaxKind.AsteriskEqualsToken]: ts.SyntaxKind.AsteriskToken,
    [ts.SyntaxKind.AmpersandEqualsToken]: ts.SyntaxKind.AmpersandToken,
    [ts.SyntaxKind.AsteriskAsteriskEqualsToken]: ts.SyntaxKind.AsteriskAsteriskToken,
    [ts.SyntaxKind.LessThanLessThanEqualsToken]: ts.SyntaxKind.LessThanLessThanToken,
    [ts.SyntaxKind.GreaterThanGreaterThanEqualsToken]: ts.SyntaxKind.GreaterThanGreaterThanToken,
    [ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken]: ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
    [ts.SyntaxKind.BarBarEqualsToken]: ts.SyntaxKind.BarBarToken,
    [ts.SyntaxKind.AmpersandAmpersandEqualsToken]: ts.SyntaxKind.AmpersandAmpersandToken,
    [ts.SyntaxKind.QuestionQuestionEqualsToken]: ts.SyntaxKind.QuestionQuestionToken,
};

export const isCompoundAssignmentToken = (token: ts.BinaryOperator): token is ts.CompoundAssignmentOperator =>
    token in compoundToAssignmentTokens;

export const unwrapCompoundAssignmentToken = (token: ts.CompoundAssignmentOperator): CompoundAssignmentToken =>
    compoundToAssignmentTokens[token];

export function transformCompoundAssignmentExpression(
    context: TransformationContext,
    expression: ts.Expression,
    // TODO: Change type to ts.LeftHandSideExpression?
    lhs: ts.Expression,
    rhs: ts.Expression,
    operator: CompoundAssignmentToken,
    isPostfix: boolean
): lua.CallExpression {
    const left = cast(context.transformExpression(lhs), lua.isAssignmentLeftHandSideExpression);
    const right = context.transformExpression(rhs);

    const [objExpression, indexExpression] = parseAccessExpressionWithEvaluationEffects(context, lhs);
    if (objExpression && indexExpression) {
        // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
        // local __obj, __index = ${objExpression}, ${indexExpression};
        const obj = lua.createIdentifier("____obj");
        const index = lua.createIdentifier("____index");
        const objAndIndexDeclaration = lua.createVariableDeclarationStatement(
            [obj, index],
            [context.transformExpression(objExpression), context.transformExpression(indexExpression)]
        );
        const accessExpression = lua.createTableIndexExpression(obj, index);

        const tmp = lua.createIdentifier("____tmp");
        let tmpDeclaration: lua.VariableDeclarationStatement;
        let assignStatement: lua.AssignmentStatement;
        if (isPostfix) {
            // local ____tmp = ____obj[____index];
            // ____obj[____index] = ____tmp ${replacementOperator} ${right};
            tmpDeclaration = lua.createVariableDeclarationStatement(tmp, accessExpression);
            const operatorExpression = transformBinaryOperation(context, tmp, right, operator, expression);
            assignStatement = lua.createAssignmentStatement(accessExpression, operatorExpression);
        } else {
            // local ____tmp = ____obj[____index] ${replacementOperator} ${right};
            // ____obj[____index] = ____tmp;
            const operatorExpression = transformBinaryOperation(context, accessExpression, right, operator, expression);
            tmpDeclaration = lua.createVariableDeclarationStatement(tmp, operatorExpression);
            assignStatement = lua.createAssignmentStatement(accessExpression, tmp);
        }
        // return ____tmp
        return createImmediatelyInvokedFunctionExpression(
            [objAndIndexDeclaration, tmpDeclaration, assignStatement],
            tmp,
            expression
        );
    } else if (isPostfix) {
        // Postfix expressions need to cache original value in temp
        // local ____tmp = ${left};
        // ${left} = ____tmp ${replacementOperator} ${right};
        // return ____tmp
        const tmpIdentifier = lua.createIdentifier("____tmp");
        const tmpDeclaration = lua.createVariableDeclarationStatement(tmpIdentifier, left);
        const operatorExpression = transformBinaryOperation(context, tmpIdentifier, right, operator, expression);
        const assignStatements = transformAssignment(context, lhs, operatorExpression);
        return createImmediatelyInvokedFunctionExpression(
            [tmpDeclaration, ...assignStatements],
            tmpIdentifier,
            expression
        );
    } else if (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs)) {
        // Simple property/element access expressions need to cache in temp to avoid double-evaluation
        // local ____tmp = ${left} ${replacementOperator} ${right};
        // ${left} = ____tmp;
        // return ____tmp
        const tmpIdentifier = lua.createIdentifier("____tmp");
        const operatorExpression = transformBinaryOperation(context, left, right, operator, expression);
        const tmpDeclaration = lua.createVariableDeclarationStatement(tmpIdentifier, operatorExpression);
        const assignStatements = transformAssignment(context, lhs, tmpIdentifier);

        if (isSetterSkippingCompoundAssignmentOperator(operator)) {
            return createImmediatelyInvokedFunctionExpression(
                [tmpDeclaration, ...transformSetterSkippingCompoundAssignment(context, tmpIdentifier, operator, rhs)],
                tmpIdentifier,
                expression
            );
        }

        return createImmediatelyInvokedFunctionExpression(
            [tmpDeclaration, ...assignStatements],
            tmpIdentifier,
            expression
        );
    } else {
        // Simple expressions
        // ${left} = ${right}; return ${right}
        const operatorExpression = transformBinaryOperation(context, left, right, operator, expression);
        const assignStatements = transformAssignment(context, lhs, operatorExpression);
        return createImmediatelyInvokedFunctionExpression(assignStatements, left, expression);
    }
}

export function transformCompoundAssignmentStatement(
    context: TransformationContext,
    node: ts.Node,
    lhs: ts.Expression,
    rhs: ts.Expression,
    operator: CompoundAssignmentToken
): lua.Statement[] {
    const left = cast(context.transformExpression(lhs), lua.isAssignmentLeftHandSideExpression);
    const right = context.transformExpression(rhs);

    const [objExpression, indexExpression] = parseAccessExpressionWithEvaluationEffects(context, lhs);
    if (objExpression && indexExpression) {
        // Complex property/element accesses need to cache object/index expressions to avoid repeating side-effects
        // local __obj, __index = ${objExpression}, ${indexExpression};
        // ____obj[____index] = ____obj[____index] ${replacementOperator} ${right};
        const obj = lua.createIdentifier("____obj");
        const index = lua.createIdentifier("____index");
        const objAndIndexDeclaration = lua.createVariableDeclarationStatement(
            [obj, index],
            [context.transformExpression(objExpression), context.transformExpression(indexExpression)]
        );
        const accessExpression = lua.createTableIndexExpression(obj, index);

        if (isSetterSkippingCompoundAssignmentOperator(operator)) {
            return [
                objAndIndexDeclaration,
                ...transformSetterSkippingCompoundAssignment(context, accessExpression, operator, rhs, node),
            ];
        }

        const operatorExpression = transformBinaryOperation(context, accessExpression, right, operator, node);
        const assignStatement = lua.createAssignmentStatement(accessExpression, operatorExpression);
        return [objAndIndexDeclaration, assignStatement];
    } else {
        if (isSetterSkippingCompoundAssignmentOperator(operator)) {
            const luaLhs = context.transformExpression(lhs) as lua.AssignmentLeftHandSideExpression;
            return transformSetterSkippingCompoundAssignment(context, luaLhs, operator, rhs, node);
        }

        // Simple statements
        // ${left} = ${left} ${replacementOperator} ${right}
        const operatorExpression = transformBinaryOperation(context, left, right, operator, node);
        return transformAssignment(context, lhs, operatorExpression);
    }
}

/* These setter-skipping operators will not execute the setter if result does not change.
 * x.y ||= z does NOT call the x.y setter if x.y is already true.
 * x.y &&= z does NOT call the x.y setter if x.y is already false.
 * x.y ??= z does NOT call the x.y setter if x.y is already not nullish.
 */
type SetterSkippingCompoundAssignmentOperator = ts.LogicalOperator | ts.SyntaxKind.QuestionQuestionToken;

function isSetterSkippingCompoundAssignmentOperator(
    operator: ts.BinaryOperator
): operator is SetterSkippingCompoundAssignmentOperator {
    return (
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken ||
        operator === ts.SyntaxKind.QuestionQuestionToken
    );
}

function transformSetterSkippingCompoundAssignment(
    context: TransformationContext,
    lhs: lua.AssignmentLeftHandSideExpression,
    operator: SetterSkippingCompoundAssignmentOperator,
    rhs: ts.Expression,
    node?: ts.Node
): lua.Statement[] {
    // These assignments have the form 'if x then y = z', figure out what condition x is first.
    let condition: lua.Expression;

    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
        condition = lhs;
    } else if (operator === ts.SyntaxKind.BarBarToken) {
        condition = lua.createUnaryExpression(lhs, lua.SyntaxKind.NotOperator);
    } else if (operator === ts.SyntaxKind.QuestionQuestionToken) {
        condition = lua.createBinaryExpression(lhs, lua.createNilLiteral(), lua.SyntaxKind.EqualityOperator);
    } else {
        assertNever(operator);
    }

    // if condition then lhs = rhs end
    return [
        lua.createIfStatement(
            condition,
            lua.createBlock([lua.createAssignmentStatement(lhs, context.transformExpression(rhs))]),
            undefined,
            node
        ),
    ];
}
