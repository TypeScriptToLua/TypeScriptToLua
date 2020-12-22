import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as extensions from "../../utils/language-extensions";
import { TransformationContext } from "../../context";
import { transformAssignmentLeftHandSideExpression } from "../binary-expression/assignments";
import { transformIdentifier } from "../identifier";
import { transformArguments } from "../call";
import { getDependenciesOfSymbol, createExportedIdentifier } from "../../utils/export";
import { createLocalOrExportedOrGlobalDeclaration } from "../../utils/lua-ast";
import {
    invalidMultiTypeArrayBindingPatternElementInitializer,
    invalidMultiTypeArrayLiteralElementInitializer,
    invalidMultiTypeToEmptyPatternOrArrayLiteral,
    invalidMultiTypeToNonArrayBindingPattern,
    invalidMultiTypeToNonArrayLiteral,
    unsupportedMultiFunctionAssignment,
    invalidMultiFunctionUse,
} from "../../utils/diagnostics";

const isMultiFunctionDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.MultiFunction;

const isMultiTypeDeclaration = (declaration: ts.Declaration): boolean =>
    extensions.getExtensionKind(declaration) === extensions.ExtensionKind.MultiType;

function isMultiFunction(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return type.symbol?.declarations?.some(isMultiFunctionDeclaration) ?? false;
}

export function returnsMultiType(context: TransformationContext, node: ts.CallExpression): boolean {
    const signature = context.checker.getResolvedSignature(node);
    return signature?.getReturnType().aliasSymbol?.declarations?.some(isMultiTypeDeclaration) ?? false;
}

export function isMultiFunctionNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return type.symbol?.declarations?.some(isMultiFunctionDeclaration) ?? false;
}

export function transformMultiHelperReturnStatement(
    context: TransformationContext,
    statement: ts.ReturnStatement
): lua.Statement | undefined {
    if (!statement.expression) return;
    if (!ts.isCallExpression(statement.expression)) return;
    if (!isMultiFunction(context, statement.expression)) return;

    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

function transformMultiFunctionArguments(
    context: TransformationContext,
    expression: ts.CallExpression
): lua.Expression[] | lua.Expression {
    if (!isMultiFunction(context, expression)) {
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
    if (!ts.isCallExpression(declaration.initializer)) return;
    if (!returnsMultiType(context, declaration.initializer)) return;

    if (!ts.isArrayBindingPattern(declaration.name)) {
        context.diagnostics.push(invalidMultiTypeToNonArrayBindingPattern(declaration.name));
        return [];
    }

    if (declaration.name.elements.length < 1) {
        context.diagnostics.push(invalidMultiTypeToEmptyPatternOrArrayLiteral(declaration.name));
        return [];
    }

    if (declaration.name.elements.some(e => ts.isBindingElement(e) && e.initializer)) {
        context.diagnostics.push(invalidMultiTypeArrayBindingPatternElementInitializer(declaration.name));
        return [];
    }

    if (isMultiFunction(context, declaration.initializer)) {
        context.diagnostics.push(invalidMultiFunctionUse(declaration.initializer));
        return [];
    }

    const leftIdentifiers: lua.Identifier[] = [];

    for (const element of declaration.name.elements) {
        if (ts.isBindingElement(element)) {
            if (ts.isIdentifier(element.name)) {
                leftIdentifiers.push(transformIdentifier(context, element.name));
            } else {
                context.diagnostics.push(unsupportedMultiFunctionAssignment(element));
            }
        } else if (ts.isOmittedExpression(element)) {
            leftIdentifiers.push(lua.createAnonymousIdentifier(element));
        }
    }

    const rightExpressions = transformMultiFunctionArguments(context, declaration.initializer);
    return createLocalOrExportedOrGlobalDeclaration(context, leftIdentifiers, rightExpressions, declaration);
}

export function transformMultiHelperDestructuringAssignmentStatement(
    context: TransformationContext,
    statement: ts.ExpressionStatement
): lua.Statement[] | undefined {
    if (!ts.isBinaryExpression(statement.expression)) return;
    if (statement.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;
    if (!ts.isCallExpression(statement.expression.right)) return;
    if (!returnsMultiType(context, statement.expression.right)) return;

    if (!ts.isArrayLiteralExpression(statement.expression.left)) {
        context.diagnostics.push(invalidMultiTypeToNonArrayLiteral(statement.expression.left));
        return [];
    }

    if (statement.expression.left.elements.some(ts.isBinaryExpression)) {
        context.diagnostics.push(invalidMultiTypeArrayLiteralElementInitializer(statement.expression.left));
        return [];
    }

    if (statement.expression.left.elements.length < 1) {
        context.diagnostics.push(invalidMultiTypeToEmptyPatternOrArrayLiteral(statement.expression.left));
        return [];
    }

    if (isMultiFunction(context, statement.expression.right)) {
        context.diagnostics.push(invalidMultiFunctionUse(statement.expression.right));
        return [];
    }

    const transformLeft = (expression: ts.Expression): lua.AssignmentLeftHandSideExpression =>
        ts.isOmittedExpression(expression)
            ? lua.createAnonymousIdentifier(expression)
            : transformAssignmentLeftHandSideExpression(context, expression);

    const leftIdentifiers = statement.expression.left.elements.map(transformLeft);

    const rightExpressions = transformMultiFunctionArguments(context, statement.expression.right);

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
    const result: ts.Node[] = [];

    for (const element of node.properties) {
        if (!ts.isShorthandPropertyAssignment(element)) continue;
        const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
        if (valueSymbol) {
            const declaration = valueSymbol.valueDeclaration;
            if (declaration && isMultiFunctionDeclaration(declaration)) {
                context.diagnostics.push(invalidMultiFunctionUse(element));
                result.push(element);
            }
        }
    }

    return result;
}
