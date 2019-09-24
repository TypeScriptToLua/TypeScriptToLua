import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { flatMap } from "../../../utils";
import { TransformationContext } from "../../context";
import { UnsupportedKind } from "../../utils/errors";
import { LuaLibFeature, transformLuaLibFunction } from "../../utils/lualib";
import { isArrayType, isAssignmentPattern } from "../../utils/typescript";
import { transformIdentifier } from "../identifier";
import { transformPropertyName } from "../literal";
import { transformAssignment, transformAssignmentStatement } from "./assignments";

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
    root: tstl.Expression
): tstl.Statement[] {
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
    root: tstl.Expression
): tstl.Statement[] {
    return transformArrayLiteralAssignmentPattern(context, node.left, root);
}

function transformArrayLiteralAssignmentPattern(
    context: TransformationContext,
    node: ts.ArrayLiteralExpression,
    root: tstl.Expression
): tstl.Statement[] {
    return flatMap(node.elements, (element, index) => {
        const indexedRoot = tstl.createTableIndexExpression(root, tstl.createNumericLiteral(index + 1), element);

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
                const assignedVariable = tstl.createIdentifier("____bindingAssignmentValue");

                const assignedVariableDeclaration = tstl.createVariableDeclarationStatement(
                    assignedVariable,
                    indexedRoot
                );

                const nilCondition = tstl.createBinaryExpression(
                    assignedVariable,
                    tstl.createNilLiteral(),
                    tstl.SyntaxKind.EqualityOperator
                );

                const defaultAssignmentStatement = transformAssignment(
                    context,
                    (element as ts.BinaryExpression).left,
                    context.transformExpression((element as ts.BinaryExpression).right)
                );

                const elseAssignmentStatement = transformAssignment(
                    context,
                    (element as ts.BinaryExpression).left,
                    assignedVariable
                );

                const ifBlock = tstl.createBlock([defaultAssignmentStatement]);

                const elseBlock = tstl.createBlock([elseAssignmentStatement]);

                const ifStatement = tstl.createIfStatement(nilCondition, ifBlock, elseBlock, node);

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
                    tstl.createNumericLiteral(index)
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
    root: tstl.Expression
): tstl.Statement[] {
    return transformObjectLiteralAssignmentPattern(context, node.left, root);
}

function transformObjectLiteralAssignmentPattern(
    context: TransformationContext,
    node: ts.ObjectLiteralExpression,
    root: tstl.Expression
): tstl.Statement[] {
    const result: tstl.Statement[] = [];

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
    root: tstl.Expression
): tstl.Statement[] {
    const result: tstl.Statement[] = [];
    const assignmentVariableName = transformIdentifier(context, node.name);
    const extractionIndex = tstl.createStringLiteral(node.name.text);
    const variableExtractionAssignmentStatement = tstl.createAssignmentStatement(
        assignmentVariableName,
        tstl.createTableIndexExpression(root, extractionIndex)
    );

    result.push(variableExtractionAssignmentStatement);

    const defaultInitializer = node.objectAssignmentInitializer
        ? context.transformExpression(node.objectAssignmentInitializer)
        : undefined;

    if (defaultInitializer) {
        const nilCondition = tstl.createBinaryExpression(
            assignmentVariableName,
            tstl.createNilLiteral(),
            tstl.SyntaxKind.EqualityOperator
        );

        const assignment = tstl.createAssignmentStatement(assignmentVariableName, defaultInitializer);

        const ifBlock = tstl.createBlock([assignment]);

        result.push(tstl.createIfStatement(nilCondition, ifBlock, undefined, node));
    }

    return result;
}

function transformPropertyAssignment(
    context: TransformationContext,
    node: ts.PropertyAssignment,
    root: tstl.Expression
): tstl.Statement[] {
    const result: tstl.Statement[] = [];

    if (isAssignmentPattern(node.initializer)) {
        const propertyAccessString = transformPropertyName(context, node.name);
        const newRootAccess = tstl.createTableIndexExpression(root, propertyAccessString);

        if (ts.isObjectLiteralExpression(node.initializer)) {
            return transformObjectLiteralAssignmentPattern(context, node.initializer, newRootAccess);
        }

        if (ts.isArrayLiteralExpression(node.initializer)) {
            return transformArrayLiteralAssignmentPattern(context, node.initializer, newRootAccess);
        }
    }

    const leftExpression = ts.isBinaryExpression(node.initializer) ? node.initializer.left : node.initializer;
    const variableToExtract = transformPropertyName(context, node.name);
    const extractingExpression = tstl.createTableIndexExpression(root, variableToExtract);

    const destructureAssignmentStatement = transformAssignment(context, leftExpression, extractingExpression);

    result.push(destructureAssignmentStatement);

    if (ts.isBinaryExpression(node.initializer)) {
        const assignmentLeftHandSide = context.transformExpression(node.initializer.left);

        const nilCondition = tstl.createBinaryExpression(
            assignmentLeftHandSide,
            tstl.createNilLiteral(),
            tstl.SyntaxKind.EqualityOperator
        );

        const ifBlock = tstl.createBlock(
            transformAssignmentStatement(context, node.initializer as ts.AssignmentExpression<ts.EqualsToken>)
        );

        result.push(tstl.createIfStatement(nilCondition, ifBlock, undefined, node));
    }

    return result;
}

function transformSpreadAssignment(
    context: TransformationContext,
    node: ts.SpreadAssignment,
    root: tstl.Expression,
    properties: ts.NodeArray<ts.ObjectLiteralElementLike>
): tstl.Statement[] {
    const usedProperties: tstl.TableFieldExpression[] = [];
    for (const property of properties) {
        if (
            (ts.isShorthandPropertyAssignment(property) || ts.isPropertyAssignment(property)) &&
            !ts.isComputedPropertyName(property.name)
        ) {
            const name = ts.isIdentifier(property.name)
                ? tstl.createStringLiteral(property.name.text)
                : context.transformExpression(property.name);

            usedProperties.push(tstl.createTableFieldExpression(tstl.createBooleanLiteral(true), name));
        }
    }

    const extractingExpression = transformLuaLibFunction(
        context,
        LuaLibFeature.ObjectRest,
        undefined,
        root,
        tstl.createTableExpression(usedProperties)
    );

    return [transformAssignment(context, node.expression, extractingExpression)];
}
