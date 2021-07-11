import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { cast } from "../../../utils";
import { TransformationContext } from "../../context";
import { isTupleReturnCall } from "../../utils/annotations";
import { validateAssignment } from "../../utils/assignment-validation";
import { createExportedIdentifier, getDependenciesOfSymbol, isSymbolExported } from "../../utils/export";
import { createUnpackCall, wrapInTable } from "../../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isDestructuringAssignment } from "../../utils/typescript";
import { transformElementAccessArgument } from "../access";
import { isArrayLength, transformDestructuringAssignment } from "./destructuring-assignments";
import { isMultiReturnCall } from "../language-extensions/multi";
import { popScope, pushScope, ScopeType } from "../../utils/scope";
import {
    ImmediatelyInvokedFunctionParameters,
    transformToImmediatelyInvokedFunctionExpression,
} from "../../utils/transform";
import { notAllowedOptionalAssignment } from "../../utils/diagnostics";

export function transformAssignmentLeftHandSideExpression(
    context: TransformationContext,
    node: ts.Expression
): lua.AssignmentLeftHandSideExpression {
    const symbol = context.checker.getSymbolAtLocation(node);
    const left = context.transformExpression(node);

    return lua.isIdentifier(left) && symbol && isSymbolExported(context, symbol)
        ? createExportedIdentifier(context, left)
        : cast(left, lua.isAssignmentLeftHandSideExpression);
}

export function transformAssignment(
    context: TransformationContext,
    // TODO: Change type to ts.LeftHandSideExpression?
    lhs: ts.Expression,
    right: lua.Expression,
    parent?: ts.Expression
): lua.Statement[] {
    if (ts.isOptionalChain(lhs)) {
        context.diagnostics.push(notAllowedOptionalAssignment(lhs));
        return [];
    }

    if (isArrayLength(context, lhs)) {
        const arrayLengthAssignment = lua.createExpressionStatement(
            transformLuaLibFunction(
                context,
                LuaLibFeature.ArraySetLength,
                parent,
                context.transformExpression(lhs.expression),
                right
            )
        );

        return [arrayLengthAssignment];
    }

    const symbol = ts.isShorthandPropertyAssignment(lhs.parent)
        ? context.checker.getShorthandAssignmentValueSymbol(lhs.parent)
        : context.checker.getSymbolAtLocation(lhs);

    const dependentSymbols = symbol ? getDependenciesOfSymbol(context, symbol) : [];

    const left = transformAssignmentLeftHandSideExpression(context, lhs);

    const rootAssignment = lua.createAssignmentStatement(left, right, lhs.parent);

    return [
        rootAssignment,
        ...dependentSymbols.map(symbol => {
            const [left] = rootAssignment.left;
            const identifierToAssign = createExportedIdentifier(context, lua.createIdentifier(symbol.name));
            return lua.createAssignmentStatement(identifierToAssign, left);
        }),
    ];
}

function transformDestructuredAssignmentExpression(
    context: TransformationContext,
    expression: ts.DestructuringAssignment
): ImmediatelyInvokedFunctionParameters {
    const rootIdentifier = lua.createAnonymousIdentifier(expression.left);

    let right = context.transformExpression(expression.right);
    if (isTupleReturnCall(context, expression.right) || isMultiReturnCall(context, expression.right)) {
        right = wrapInTable(right);
    }

    const statements = [
        lua.createVariableDeclarationStatement(rootIdentifier, right),
        ...transformDestructuringAssignment(context, expression, rootIdentifier),
    ];

    return { statements, result: rootIdentifier };
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
        return transformToImmediatelyInvokedFunctionExpression(
            context,
            () => transformDestructuredAssignmentExpression(context, expression),
            expression
        );
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
        pushScope(context, ScopeType.Function);
        const objExpression = context.transformExpression(expression.left.expression);
        let indexExpression: lua.Expression;
        if (ts.isPropertyAccessExpression(expression.left)) {
            // Property access
            indexExpression = lua.createStringLiteral(expression.left.name.text);
        } else {
            // Element access
            indexExpression = transformElementAccessArgument(context, expression.left);
        }

        const args = [objExpression, indexExpression, context.transformExpression(expression.right)];
        popScope(context);
        return lua.createCallExpression(iife, args, expression);
    } else {
        return transformToImmediatelyInvokedFunctionExpression(
            context,
            () => {
                // Simple assignment
                // (function() ${left} = ${right}; return ${left} end)()
                const left = context.transformExpression(expression.left);
                const right = context.transformExpression(expression.right);
                const statements = transformAssignment(context, expression.left, right);
                return { statements, result: left };
            },
            expression
        );
    }
}

const canBeTransformedToLuaAssignmentStatement = (
    context: TransformationContext,
    node: ts.DestructuringAssignment
): node is ts.ArrayDestructuringAssignment =>
    ts.isArrayLiteralExpression(node.left) &&
    node.left.elements.every(element => {
        if (isArrayLength(context, element)) {
            return false;
        }

        if (ts.isPropertyAccessExpression(element) || ts.isElementAccessExpression(element)) {
            return true;
        }

        if (ts.isIdentifier(element)) {
            const symbol = context.checker.getSymbolAtLocation(element);
            if (symbol) {
                const aliases = getDependenciesOfSymbol(context, symbol);
                return aliases.length === 0;
            }
        }
    });

export function transformAssignmentStatement(
    context: TransformationContext,
    expression: ts.AssignmentExpression<ts.EqualsToken>
): lua.Statement[] {
    // Validate assignment
    const rightType = context.checker.getTypeAtLocation(expression.right);
    const leftType = context.checker.getTypeAtLocation(expression.left);
    validateAssignment(context, expression.right, rightType, leftType);

    if (isDestructuringAssignment(expression)) {
        if (canBeTransformedToLuaAssignmentStatement(context, expression)) {
            const rightType = context.checker.getTypeAtLocation(expression.right);
            let right = context.transformExpression(expression.right);

            if (
                !(isTupleReturnCall(context, expression.right) || isMultiReturnCall(context, expression.right)) &&
                isArrayType(context, rightType)
            ) {
                right = createUnpackCall(context, right, expression.right);
            }

            const left = expression.left.elements.map(e => transformAssignmentLeftHandSideExpression(context, e));

            return [lua.createAssignmentStatement(left, right, expression)];
        }

        let right = context.transformExpression(expression.right);
        if (isTupleReturnCall(context, expression.right) || isMultiReturnCall(context, expression.right)) {
            right = wrapInTable(right);
        }

        const rootIdentifier = lua.createAnonymousIdentifier(expression.left);
        return [
            lua.createVariableDeclarationStatement(rootIdentifier, right),
            ...transformDestructuringAssignment(context, expression, rootIdentifier),
        ];
    } else {
        return transformAssignment(context, expression.left, context.transformExpression(expression.right));
    }
}
