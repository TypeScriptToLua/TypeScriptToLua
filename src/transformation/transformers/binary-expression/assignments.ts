import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { cast, castEach } from "../../../utils";
import { TransformationContext } from "../../context";
import { isTupleReturnCall } from "../../utils/annotations";
import { validateAssignment, validatePropertyAssignment } from "../../utils/assignment-validation";
import { createImmediatelyInvokedFunctionExpression, createUnpackCall, wrapInTable } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isDestructuringAssignment } from "../../utils/typescript";
import { transformElementAccessArgument } from "../access";
import { isArrayLength, transformDestructuringAssignment } from "./destructuring-assignments";

export function transformAssignment(
    context: TransformationContext,
    // TODO: Change type to ts.LeftHandSideExpression?
    lhs: ts.Expression,
    right: tstl.Expression,
    parent?: ts.Expression
): tstl.Statement {
    if (isArrayLength(context, lhs)) {
        return tstl.createExpressionStatement(
            transformLuaLibFunction(
                context,
                LuaLibFeature.ArraySetLength,
                parent,
                context.transformExpression(lhs.expression),
                right
            )
        );
    }

    return tstl.createAssignmentStatement(
        cast(context.transformExpression(lhs), tstl.isAssignmentLeftHandSideExpression),
        right,
        lhs.parent
    );
}

export function transformAssignmentExpression(
    context: TransformationContext,
    expression: ts.AssignmentExpression<ts.EqualsToken>
): tstl.CallExpression | tstl.MethodCallExpression {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    validateAssignment(context, expression.right, rightType, leftType);

    if (isArrayLength(context, expression.left)) {
        // array.length = x
        return transformLuaLibFunction(
            context,
            LuaLibFeature.ArraySetLength,
            expression,
            context.transformExpression(expression.left.expression),
            context.transformExpression(expression.right)
        );
    }

    if (isDestructuringAssignment(expression)) {
        const rootIdentifier = tstl.createAnonymousIdentifier(expression.left);

        let right = context.transformExpression(expression.right);
        if (isTupleReturnCall(context, expression.right)) {
            right = wrapInTable(right);
        }

        const statements = [
            tstl.createVariableDeclarationStatement(rootIdentifier, right),
            ...transformDestructuringAssignment(context, expression, rootIdentifier),
        ];

        return createImmediatelyInvokedFunctionExpression(statements, rootIdentifier, expression);
    }

    if (ts.isPropertyAccessExpression(expression.left) || ts.isElementAccessExpression(expression.left)) {
        // Left is property/element access: cache result while maintaining order of evaluation
        // (function(o, i, v) o[i] = v; return v end)(${objExpression}, ${indexExpression}, ${right})
        const objParameter = tstl.createIdentifier("o");
        const indexParameter = tstl.createIdentifier("i");
        const valueParameter = tstl.createIdentifier("v");
        const indexStatement = tstl.createTableIndexExpression(objParameter, indexParameter);
        const statements: tstl.Statement[] = [
            tstl.createAssignmentStatement(indexStatement, valueParameter),
            tstl.createReturnStatement([valueParameter]),
        ];
        const iife = tstl.createFunctionExpression(tstl.createBlock(statements), [
            objParameter,
            indexParameter,
            valueParameter,
        ]);
        const objExpression = context.transformExpression(expression.left.expression);
        let indexExpression: tstl.Expression;
        if (ts.isPropertyAccessExpression(expression.left)) {
            // Property access
            indexExpression = tstl.createStringLiteral(expression.left.name.text);
        } else {
            // Element access
            indexExpression = transformElementAccessArgument(context, expression.left);
        }

        const args = [objExpression, indexExpression, context.transformExpression(expression.right)];
        return tstl.createCallExpression(tstl.createParenthesizedExpression(iife), args, expression);
    } else {
        // Simple assignment
        // (function() ${left} = ${right}; return ${left} end)()
        const left = context.transformExpression(expression.left);
        const right = context.transformExpression(expression.right);
        return createImmediatelyInvokedFunctionExpression(
            [transformAssignment(context, expression.left, right)],
            left,
            expression
        );
    }
}

export function transformAssignmentStatement(
    context: TransformationContext,
    expression: ts.AssignmentExpression<ts.EqualsToken>
): tstl.Statement[] {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    validateAssignment(context, expression.right, rightType, leftType);
    validatePropertyAssignment(context, expression);

    if (isDestructuringAssignment(expression)) {
        if (
            ts.isArrayLiteralExpression(expression.left) &&
            expression.left.elements.every(
                e =>
                    (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) &&
                    !isArrayLength(context, e)
            )
        ) {
            const rightType = context.checker.getTypeAtLocation(expression.right);
            let right = context.transformExpression(expression.right);

            if (!isTupleReturnCall(context, expression.right) && isArrayType(context, rightType)) {
                right = createUnpackCall(context, right, expression.right);
            }

            const left = castEach(
                expression.left.elements.map(e => context.transformExpression(e)),
                tstl.isAssignmentLeftHandSideExpression
            );

            return [tstl.createAssignmentStatement(left, right, expression)];
        }

        let right = context.transformExpression(expression.right);
        if (isTupleReturnCall(context, expression.right)) {
            right = wrapInTable(right);
        }

        const rootIdentifier = tstl.createAnonymousIdentifier(expression.left);
        return [
            tstl.createVariableDeclarationStatement(rootIdentifier, right),
            ...transformDestructuringAssignment(context, expression, rootIdentifier),
        ];
    } else {
        return [transformAssignment(context, expression.left, context.transformExpression(expression.right))];
    }
}
