import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast } from "../../../utils";
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

const compoundToAssignmentTokens: Record<ts.CompoundAssignmentOperator, ts.BinaryOperator> = {
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
};

export const isCompoundAssignmentToken = (token: ts.BinaryOperator): token is ts.CompoundAssignmentOperator =>
    token in compoundToAssignmentTokens;

export const unwrapCompoundAssignmentToken = (token: ts.CompoundAssignmentOperator) =>
    compoundToAssignmentTokens[token];

export function transformCompoundAssignmentExpression(
    context: TransformationContext,
    expression: ts.Expression,
    // TODO: Change type to ts.LeftHandSideExpression?
    lhs: ts.Expression,
    rhs: ts.Expression,
    replacementOperator: ts.BinaryOperator,
    isPostfix: boolean
): lua.CallExpression {
    const left = cast(context.transformExpression(lhs), lua.isAssignmentLeftHandSideExpression);
    let right = context.transformExpression(rhs);

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
        right = lua.createParenthesizedExpression(right);
        let tmpDeclaration: lua.VariableDeclarationStatement;
        let assignStatement: lua.AssignmentStatement;
        if (isPostfix) {
            // local ____tmp = ____obj[____index];
            // ____obj[____index] = ____tmp ${replacementOperator} ${right};
            tmpDeclaration = lua.createVariableDeclarationStatement(tmp, accessExpression);
            const operatorExpression = transformBinaryOperation(context, tmp, right, replacementOperator, expression);
            assignStatement = lua.createAssignmentStatement(accessExpression, operatorExpression);
        } else {
            // local ____tmp = ____obj[____index] ${replacementOperator} ${right};
            // ____obj[____index] = ____tmp;
            const operatorExpression = transformBinaryOperation(
                context,
                accessExpression,
                right,
                replacementOperator,
                expression
            );
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
        const operatorExpression = transformBinaryOperation(
            context,
            tmpIdentifier,
            right,
            replacementOperator,
            expression
        );
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
        const operatorExpression = transformBinaryOperation(context, left, right, replacementOperator, expression);
        const tmpDeclaration = lua.createVariableDeclarationStatement(tmpIdentifier, operatorExpression);
        const assignStatements = transformAssignment(context, lhs, tmpIdentifier);
        return createImmediatelyInvokedFunctionExpression(
            [tmpDeclaration, ...assignStatements],
            tmpIdentifier,
            expression
        );
    } else {
        // Simple expressions
        // ${left} = ${right}; return ${right}
        const operatorExpression = transformBinaryOperation(context, left, right, replacementOperator, expression);
        const assignStatements = transformAssignment(context, lhs, operatorExpression);
        return createImmediatelyInvokedFunctionExpression(assignStatements, left, expression);
    }
}

export function transformCompoundAssignmentStatement(
    context: TransformationContext,
    node: ts.Node,
    lhs: ts.Expression,
    rhs: ts.Expression,
    replacementOperator: ts.BinaryOperator
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
        const operatorExpression = transformBinaryOperation(
            context,
            accessExpression,
            lua.createParenthesizedExpression(right),
            replacementOperator,
            node
        );
        const assignStatement = lua.createAssignmentStatement(accessExpression, operatorExpression);
        return [objAndIndexDeclaration, assignStatement];
    } else {
        // Simple statements
        // ${left} = ${left} ${replacementOperator} ${right}
        const operatorExpression = transformBinaryOperation(context, left, right, replacementOperator, node);
        const assignmentStatements = transformAssignment(context, lhs, operatorExpression);
        return assignmentStatements;
    }
}
