import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast, castEach } from "../../../utils";
import { TransformationContext } from "../../context";
import { isTupleReturnCall } from "../../utils/annotations";
import { validateAssignment } from "../../utils/assignment-validation";
import { createImmediatelyInvokedFunctionExpression, createUnpackCall, wrapInTable } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isDestructuringAssignment } from "../../utils/typescript";
import { transformElementAccessArgument } from "../access";
import { transformLuaTablePropertyAccessInAssignment } from "../lua-table";
import { isArrayLength, transformDestructuringAssignment } from "./destructuring-assignments";

export function transformAssignment(
    context: TransformationContext,
    // TODO: Change type to ts.LeftHandSideExpression?
    lhs: ts.Expression,
    right: lua.Expression,
    parent?: ts.Expression
): lua.Statement {
    if (isArrayLength(context, lhs)) {
        return lua.createExpressionStatement(
            transformLuaLibFunction(
                context,
                LuaLibFeature.ArraySetLength,
                parent,
                context.transformExpression(lhs.expression),
                right
            )
        );
    }

    let left: lua.AssignmentLeftHandSideExpression | undefined;
    if (ts.isPropertyAccessExpression(lhs)) {
        left = transformLuaTablePropertyAccessInAssignment(context, lhs);
    }

    if (!left) {
        left = cast(context.transformExpression(lhs), lua.isAssignmentLeftHandSideExpression);
    }

    return lua.createAssignmentStatement(left, right, parent);
}

export function transformAssignmentExpression(
    context: TransformationContext,
    expression: ts.AssignmentExpression<ts.EqualsToken>
): lua.Expression {
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
        const rootIdentifier = lua.createAnonymousIdentifier(expression.left);

        let right = context.transformExpression(expression.right);
        if (isTupleReturnCall(context, expression.right)) {
            right = wrapInTable(right);
        }

        const statements = [
            lua.createVariableDeclarationStatement(rootIdentifier, right),
            ...transformDestructuringAssignment(context, expression, rootIdentifier),
        ];

        return createImmediatelyInvokedFunctionExpression(statements, rootIdentifier, expression);
    }

    if (ts.isPropertyAccessExpression(expression.left) || ts.isElementAccessExpression(expression.left)) {
        // Left is property/element access: cache result while maintaining order of evaluation
        // (function(o, i, v) o[i] = v; return v end)(${objExpression}, ${indexExpression}, ${right})
        const objParameter = lua.createIdentifier("o");
        const indexParameter = lua.createIdentifier("i");
        const valueParameter = lua.createIdentifier("v");
        const indexStatement = lua.createTableIndexExpression(objParameter, indexParameter);
        const statements: lua.Statement[] = [
            lua.createAssignmentStatement(indexStatement, valueParameter),
            lua.createReturnStatement([valueParameter]),
        ];
        const iife = lua.createFunctionExpression(lua.createBlock(statements), [
            objParameter,
            indexParameter,
            valueParameter,
        ]);
        const objExpression = context.transformExpression(expression.left.expression);
        let indexExpression: lua.Expression;
        if (ts.isPropertyAccessExpression(expression.left)) {
            // Called only for validation
            transformLuaTablePropertyAccessInAssignment(context, expression.left);

            // Property access
            indexExpression = lua.createStringLiteral(expression.left.name.text);
        } else {
            // Element access
            indexExpression = transformElementAccessArgument(context, expression.left);
        }

        const args = [objExpression, indexExpression, context.transformExpression(expression.right)];
        return lua.createCallExpression(lua.createParenthesizedExpression(iife), args, expression);
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
): lua.Statement[] {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    validateAssignment(context, expression.right, rightType, leftType);

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
                lua.isAssignmentLeftHandSideExpression
            );

            return [lua.createAssignmentStatement(left, right, expression)];
        }

        let right = context.transformExpression(expression.right);
        if (isTupleReturnCall(context, expression.right)) {
            right = wrapInTable(right);
        }

        const rootIdentifier = lua.createAnonymousIdentifier(expression.left);
        return [
            lua.createVariableDeclarationStatement(rootIdentifier, right),
            ...transformDestructuringAssignment(context, expression, rootIdentifier),
        ];
    } else {
        return [transformAssignment(context, expression.left, context.transformExpression(expression.right))];
    }
}
