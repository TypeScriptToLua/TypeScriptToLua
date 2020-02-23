import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { UnsupportedKind } from "../../utils/errors";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isAssignmentPattern } from "../../utils/typescript";
import { transformPropertyName } from "../literal";
import {
    transformAssignment,
    transformAssignmentLeftHandSideExpression,
    transformAssignmentStatement,
} from "./assignments";

export function isArrayLength(
    context: TransformationContext,
    expression: ts.Expression
): expression is ts.PropertyAccessExpression | ts.ElementAccessExpression {
    if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) {
        return false;
    }

    const type = context.checker.getTypeAtLocation(expression.expression);
    if (!isArrayType(context, type)) {
        return false;
    }

    const name = ts.isPropertyAccessExpression(expression)
        ? expression.name.text
        : ts.isStringLiteral(expression.argumentExpression)
        ? expression.argumentExpression.text
        : undefined;

    return name === "length";
}

export function transformDestructuringAssignment(
    context: TransformationContext,
    node: ts.DestructuringAssignment,
    root: lua.Expression
): lua.Statement[] {
    switch (node.left.kind) {
        case ts.SyntaxKind.ObjectLiteralExpression:
            return transformObjectDestructuringAssignment(context, node as ts.ObjectDestructuringAssignment, root);
        case ts.SyntaxKind.ArrayLiteralExpression:
            return transformArrayDestructuringAssignment(context, node as ts.ArrayDestructuringAssignment, root);
    }
}

function transformArrayDestructuringAssignment(
    context: TransformationContext,
    node: ts.ArrayDestructuringAssignment,
    root: lua.Expression
): lua.Statement[] {
    return transformArrayLiteralAssignmentPattern(context, node.left, root);
}

function transformArrayLiteralAssignmentPattern(
    context: TransformationContext,
    node: ts.ArrayLiteralExpression,
    root: lua.Expression
): lua.Statement[] {
    return node.elements.flatMap((element, index) => {
        const indexedRoot = lua.createTableIndexExpression(root, lua.createNumericLiteral(index + 1), element);

        switch (element.kind) {
            case ts.SyntaxKind.ObjectLiteralExpression:
                return transformObjectLiteralAssignmentPattern(
                    context,
                    element as ts.ObjectLiteralExpression,
                    indexedRoot
                );
            case ts.SyntaxKind.ArrayLiteralExpression:
                return transformArrayLiteralAssignmentPattern(
                    context,
                    element as ts.ArrayLiteralExpression,
                    indexedRoot
                );
            case ts.SyntaxKind.BinaryExpression:
                const assignedVariable = lua.createIdentifier("____bindingAssignmentValue");

                const assignedVariableDeclaration = lua.createVariableDeclarationStatement(
                    assignedVariable,
                    indexedRoot
                );

                const nilCondition = lua.createBinaryExpression(
                    assignedVariable,
                    lua.createNilLiteral(),
                    lua.SyntaxKind.EqualityOperator
                );

                const defaultAssignmentStatements = transformAssignment(
                    context,
                    (element as ts.BinaryExpression).left,
                    context.transformExpression((element as ts.BinaryExpression).right)
                );

                const elseAssignmentStatements = transformAssignment(
                    context,
                    (element as ts.BinaryExpression).left,
                    assignedVariable
                );

                const ifBlock = lua.createBlock(defaultAssignmentStatements);

                const elseBlock = lua.createBlock(elseAssignmentStatements);

                const ifStatement = lua.createIfStatement(nilCondition, ifBlock, elseBlock, node);

                return [assignedVariableDeclaration, ifStatement];
            case ts.SyntaxKind.Identifier:
            case ts.SyntaxKind.PropertyAccessExpression:
            case ts.SyntaxKind.ElementAccessExpression:
                return transformAssignment(context, element, indexedRoot);
            case ts.SyntaxKind.SpreadElement:
                if (index !== node.elements.length - 1) return [];

                const restElements = transformLuaLibFunction(
                    context,
                    LuaLibFeature.ArraySlice,
                    undefined,
                    root,
                    lua.createNumericLiteral(index)
                );

                return transformAssignment(context, (element as ts.SpreadElement).expression, restElements);
            case ts.SyntaxKind.OmittedExpression:
                return [];
            default:
                throw UnsupportedKind("Array Destructure Assignment Element", element.kind, element);
        }
    });
}

function transformObjectDestructuringAssignment(
    context: TransformationContext,
    node: ts.ObjectDestructuringAssignment,
    root: lua.Expression
): lua.Statement[] {
    return transformObjectLiteralAssignmentPattern(context, node.left, root);
}

function transformObjectLiteralAssignmentPattern(
    context: TransformationContext,
    node: ts.ObjectLiteralExpression,
    root: lua.Expression
): lua.Statement[] {
    const result: lua.Statement[] = [];

    for (const property of node.properties) {
        switch (property.kind) {
            case ts.SyntaxKind.ShorthandPropertyAssignment:
                result.push(...transformShorthandPropertyAssignment(context, property, root));
                break;
            case ts.SyntaxKind.PropertyAssignment:
                result.push(...transformPropertyAssignment(context, property, root));
                break;
            case ts.SyntaxKind.SpreadAssignment:
                result.push(...transformSpreadAssignment(context, property, root, node.properties));
                break;
            default:
                throw UnsupportedKind("Object Destructure Property", property.kind, property);
        }
    }

    return result;
}

function transformShorthandPropertyAssignment(
    context: TransformationContext,
    node: ts.ShorthandPropertyAssignment,
    root: lua.Expression
): lua.Statement[] {
    const result: lua.Statement[] = [];
    const assignmentVariableName = transformAssignmentLeftHandSideExpression(context, node.name);
    const extractionIndex = lua.createStringLiteral(node.name.text);
    const variableExtractionAssignmentStatements = transformAssignment(
        context,
        node.name,
        lua.createTableIndexExpression(root, extractionIndex)
    );

    result.push(...variableExtractionAssignmentStatements);

    const defaultInitializer = node.objectAssignmentInitializer
        ? context.transformExpression(node.objectAssignmentInitializer)
        : undefined;

    if (defaultInitializer) {
        const nilCondition = lua.createBinaryExpression(
            assignmentVariableName,
            lua.createNilLiteral(),
            lua.SyntaxKind.EqualityOperator
        );

        const assignmentStatements = transformAssignment(context, node.name, defaultInitializer);

        const ifBlock = lua.createBlock(assignmentStatements);

        result.push(lua.createIfStatement(nilCondition, ifBlock, undefined, node));
    }

    return result;
}

function transformPropertyAssignment(
    context: TransformationContext,
    node: ts.PropertyAssignment,
    root: lua.Expression
): lua.Statement[] {
    const result: lua.Statement[] = [];

    if (isAssignmentPattern(node.initializer)) {
        const propertyAccessString = transformPropertyName(context, node.name);
        const newRootAccess = lua.createTableIndexExpression(root, propertyAccessString);

        if (ts.isObjectLiteralExpression(node.initializer)) {
            return transformObjectLiteralAssignmentPattern(context, node.initializer, newRootAccess);
        }

        if (ts.isArrayLiteralExpression(node.initializer)) {
            return transformArrayLiteralAssignmentPattern(context, node.initializer, newRootAccess);
        }
    }

    const leftExpression = ts.isBinaryExpression(node.initializer) ? node.initializer.left : node.initializer;
    const variableToExtract = transformPropertyName(context, node.name);
    const extractingExpression = lua.createTableIndexExpression(root, variableToExtract);

    const destructureAssignmentStatements = transformAssignment(context, leftExpression, extractingExpression);

    result.push(...destructureAssignmentStatements);

    if (ts.isBinaryExpression(node.initializer)) {
        const assignmentLeftHandSide = context.transformExpression(node.initializer.left);

        const nilCondition = lua.createBinaryExpression(
            assignmentLeftHandSide,
            lua.createNilLiteral(),
            lua.SyntaxKind.EqualityOperator
        );

        const ifBlock = lua.createBlock(
            transformAssignmentStatement(context, node.initializer as ts.AssignmentExpression<ts.EqualsToken>)
        );

        result.push(lua.createIfStatement(nilCondition, ifBlock, undefined, node));
    }

    return result;
}

function transformSpreadAssignment(
    context: TransformationContext,
    node: ts.SpreadAssignment,
    root: lua.Expression,
    properties: ts.NodeArray<ts.ObjectLiteralElementLike>
): lua.Statement[] {
    const usedProperties: lua.TableFieldExpression[] = [];
    for (const property of properties) {
        if (
            (ts.isShorthandPropertyAssignment(property) || ts.isPropertyAssignment(property)) &&
            !ts.isComputedPropertyName(property.name)
        ) {
            const name = ts.isIdentifier(property.name)
                ? lua.createStringLiteral(property.name.text)
                : context.transformExpression(property.name);

            usedProperties.push(lua.createTableFieldExpression(lua.createBooleanLiteral(true), name));
        }
    }

    const extractingExpression = transformLuaLibFunction(
        context,
        LuaLibFeature.ObjectRest,
        undefined,
        root,
        lua.createTableExpression(usedProperties)
    );

    return transformAssignment(context, node.expression, extractingExpression);
}
