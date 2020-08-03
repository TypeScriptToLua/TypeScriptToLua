import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as helpers from "../../utils/helpers";
import { isNonNull } from "../../../utils";
import { TransformationContext } from "../../context";
import { transformAssignmentLeftHandSideExpression } from "../binary-expression/assignments";
import { transformIdentifier } from "../identifier";
import { transformArguments } from "../call";
import { getDependenciesOfSymbol, createExportedIdentifier } from "../../utils/export";
import { createLocalOrExportedOrGlobalDeclaration } from "../../utils/lua-ast";
import {
    invalidMultiReturnArrayBindingPatternElementInitializer,
    invalidMultiReturnArrayLiteralElementInitializer,
    invalidMultiReturnToEmptyPatternOrArrayLiteral,
    invalidMultiReturnToNonArrayBindingPattern,
    invalidMultiReturnToNonArrayLiteral,
    unsupportedMultiFunctionAssignment,
    unsupportedMultiHelperFunctionPosition,
} from "../../../transformation/utils/diagnostics";

const isMultiHelperDeclaration = (context: TransformationContext) => (declaration: ts.Declaration): boolean =>
    helpers.getHelperFileKind(context, declaration.getSourceFile()) === helpers.HelperKind.Multi;

function isMultiHelperCallSignature(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return type.symbol?.declarations?.some(isMultiHelperDeclaration(context)) ?? false;
}

export function isMultiReturnCall(context: TransformationContext, node: ts.Node): node is ts.CallExpression {
    if (!ts.isCallExpression(node)) {
        return false;
    }

    const signature = context.checker.getResolvedSignature(node);
    return signature?.getReturnType().aliasSymbol?.declarations?.some(isMultiHelperDeclaration(context)) ?? false;
}

export function isMultiHelperNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return type.symbol?.declarations?.some(isMultiHelperDeclaration(context)) ?? false;
}

export function transformMultiHelperReturnStatement(
    context: TransformationContext,
    statement: ts.ReturnStatement
): lua.Statement | undefined {
    if (!statement.expression) return;
    if (!ts.isCallExpression(statement.expression)) return;
    if (!isMultiHelperCallSignature(context, statement.expression)) return;

    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

function transformMultiHelperCallArguments(
    context: TransformationContext,
    expression: ts.CallExpression
): lua.Expression[] | lua.Expression {
    if (!isMultiHelperCallSignature(context, expression)) {
        return context.transformExpression(expression);
    }

    if (expression.arguments.length === 0) {
        return lua.createNilLiteral(expression);
    }

    return expression.arguments.map(e => context.transformExpression(e));
}

export function transformMultiHelperVariableDeclaration(
    context: TransformationContext,
    declaration: ts.VariableDeclaration
): lua.Statement[] | undefined {
    if (!declaration.initializer) return;
    if (!isMultiReturnCall(context, declaration.initializer)) return;

    if (!ts.isArrayBindingPattern(declaration.name)) {
        context.diagnostics.push(invalidMultiReturnToNonArrayBindingPattern(declaration.name));
        return [];
    }

    if (declaration.name.elements.length < 1) {
        context.diagnostics.push(invalidMultiReturnToEmptyPatternOrArrayLiteral(declaration.name));
        return [];
    }

    const leftIdentifiers: lua.Identifier[] = [];

    for (const element of declaration.name.elements) {
        if (ts.isBindingElement(element)) {
            if (element.initializer) {
                context.diagnostics.push(invalidMultiReturnArrayBindingPatternElementInitializer(element));
            } else if (ts.isIdentifier(element.name)) {
                leftIdentifiers.push(transformIdentifier(context, element.name));
            } else {
                context.diagnostics.push(unsupportedMultiFunctionAssignment(element));
            }
        } else if (ts.isOmittedExpression(element)) {
            leftIdentifiers.push(lua.createAnonymousIdentifier(element));
        }
    }

    const rightExpressions = transformMultiHelperCallArguments(context, declaration.initializer);
    return createLocalOrExportedOrGlobalDeclaration(context, leftIdentifiers, rightExpressions, declaration);
}

export function transformMultiHelperDestructuringAssignmentStatement(
    context: TransformationContext,
    statement: ts.ExpressionStatement
): lua.Statement[] | undefined {
    if (!ts.isBinaryExpression(statement.expression)) return;
    if (statement.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    if (!isMultiReturnCall(context, statement.expression.right)) return;

    if (!ts.isArrayLiteralExpression(statement.expression.left)) {
        context.diagnostics.push(invalidMultiReturnToNonArrayLiteral(statement.expression.left));
        return [];
    }

    if (statement.expression.left.elements.some(ts.isBinaryExpression)) {
        context.diagnostics.push(invalidMultiReturnArrayLiteralElementInitializer(statement.expression.left));
        return [];
    }

    if (statement.expression.left.elements.length < 1) {
        context.diagnostics.push(invalidMultiReturnToEmptyPatternOrArrayLiteral(statement.expression.left));
        return [];
    }

    const transformLeft = (expression: ts.Expression): lua.AssignmentLeftHandSideExpression =>
        ts.isOmittedExpression(expression)
            ? lua.createAnonymousIdentifier(expression)
            : transformAssignmentLeftHandSideExpression(context, expression);

    const leftIdentifiers = statement.expression.left.elements.map(transformLeft);

    const rightExpressions = transformMultiHelperCallArguments(context, statement.expression.right);

    const trailingStatements = statement.expression.left.elements.flatMap(expression => {
        const symbol = context.checker.getSymbolAtLocation(expression);
        const dependentSymbols = symbol ? getDependenciesOfSymbol(context, symbol) : [];
        return dependentSymbols.map(symbol => {
            const identifierToAssign = createExportedIdentifier(context, lua.createIdentifier(symbol.name));
            return lua.createAssignmentStatement(identifierToAssign, transformLeft(expression));
        });
    });

    return [lua.createAssignmentStatement(leftIdentifiers, rightExpressions, statement), ...trailingStatements];
}

export function findMultiHelperAssignmentViolations(
    context: TransformationContext,
    node: ts.ObjectLiteralExpression
): ts.Node[] {
    return node.properties
        .filter(ts.isShorthandPropertyAssignment)
        .map(element => {
            const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
            if (valueSymbol) {
                const declaration = valueSymbol.valueDeclaration;
                if (declaration && isMultiHelperDeclaration(context)(declaration)) {
                    context.diagnostics.push(unsupportedMultiHelperFunctionPosition(element));
                    return element;
                }
            }
        })
        .filter(isNonNull);
}
