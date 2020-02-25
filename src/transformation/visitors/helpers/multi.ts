import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as utils from "../../utils/helpers";
import { TransformationContext } from "../../context";
import { transformAssignmentLeftHandSideExpression } from "../binary-expression/assignments";
import { transformIdentifier } from "../identifier";
import { transformArguments } from "../call";
import { InvalidMultiHelperFunctionUse, UnsupportedKind } from "../../utils/errors";
import { isSymbolAlias } from "../../utils/symbols";
import { getDependenciesOfSymbol, createExportedIdentifier } from "../../utils/export";
import { createLocalOrExportedOrGlobalDeclaration } from "../../utils/lua-ast";

function isMultiHelperDeclaration(declaration: ts.Declaration): boolean {
    return utils.getHelperFileKind(declaration.getSourceFile()) === utils.HelperKind.Multi;
}

function isMultiHelperCallSignature(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return Boolean(type.symbol?.declarations?.some(isMultiHelperDeclaration));
}

function isMultiReturningCallExpression(context: TransformationContext, expression: ts.CallExpression): boolean {
    const signature = context.checker.getResolvedSignature(expression);
    return Boolean(signature?.getReturnType().aliasSymbol?.declarations?.some(isMultiHelperDeclaration));
}

export function isMultiHelperNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return Boolean(type.symbol?.declarations?.some(isMultiHelperDeclaration));
}

export function transformMultiHelperReturnStatement(
    context: TransformationContext,
    statement: ts.ReturnStatement
): lua.Statement | undefined {
    if (!statement.expression) {
        return undefined;
    }

    if (!ts.isCallExpression(statement.expression)) {
        return undefined;
    }

    if (!isMultiHelperCallSignature(context, statement.expression)) {
        return undefined;
    }

    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

function transformMultiHelperCallArguments(
    context: TransformationContext,
    expression: ts.CallExpression
): lua.Expression[] | lua.Expression {
    return isMultiHelperCallSignature(context, expression)
        ? expression.arguments.length > 0
            ? expression.arguments.map(e => context.transformExpression(e))
            : lua.createNilLiteral(expression)
        : context.transformExpression(expression);
}

export function transformMultiHelperVariableDeclaration(
    context: TransformationContext,
    declaration: ts.VariableDeclaration
): lua.Statement[] | undefined {
    if (!declaration.initializer) {
        return undefined;
    }

    if (!ts.isCallExpression(declaration.initializer)) {
        return undefined;
    }

    if (!isMultiReturningCallExpression(context, declaration.initializer)) {
        return undefined;
    }

    if (!ts.isArrayBindingPattern(declaration.name)) {
        throw InvalidMultiHelperFunctionUse(declaration.name);
    }

    if (declaration.name.elements.length < 1) {
        throw InvalidMultiHelperFunctionUse(declaration.name);
    }

    const leftIdentifiers = declaration.name.elements.map(element => {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            return transformIdentifier(context, element.name);
        }

        if (ts.isOmittedExpression(element)) {
            return lua.createAnonymousIdentifier(element);
        }

        throw UnsupportedKind("Array Destructure Assignment Element", element.kind, element);
    });
    const rightExpressions = transformMultiHelperCallArguments(context, declaration.initializer);
    return createLocalOrExportedOrGlobalDeclaration(context, leftIdentifiers, rightExpressions, declaration);
}

export function transformMultiHelperDestructuringAssignmentStatement(
    context: TransformationContext,
    statement: ts.ExpressionStatement
): lua.Statement[] | undefined {
    if (!ts.isBinaryExpression(statement.expression)) {
        return undefined;
    }

    if (statement.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return undefined;
    }

    if (!ts.isCallExpression(statement.expression.right)) {
        return undefined;
    }

    if (!isMultiReturningCallExpression(context, statement.expression.right)) {
        return undefined;
    }

    if (!ts.isArrayLiteralExpression(statement.expression.left)) {
        throw InvalidMultiHelperFunctionUse(statement.expression.left);
    }

    if (statement.expression.left.elements.length < 1) {
        throw InvalidMultiHelperFunctionUse(statement.expression.left);
    }

    if (statement.expression.left.elements.some(ts.isBinaryExpression)) {
        throw InvalidMultiHelperFunctionUse(statement.expression.left);
    }

    const transformLeft = (expression: ts.Expression): lua.AssignmentLeftHandSideExpression => {
        if (ts.isOmittedExpression(expression)) {
            return lua.createAnonymousIdentifier(expression);
        } else {
            return transformAssignmentLeftHandSideExpression(context, expression);
        }
    };

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

export function validateMultiHelperFunctionNotAssignedWithin(
    context: TransformationContext,
    node: ts.ObjectLiteralExpression
): void {
    node.properties.filter(ts.isShorthandPropertyAssignment).forEach(element => {
        const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
        if (valueSymbol && isSymbolAlias(valueSymbol)) {
            const declaration = context.checker.getAliasedSymbol(valueSymbol).valueDeclaration;
            if (declaration && isMultiHelperDeclaration(declaration)) {
                throw InvalidMultiHelperFunctionUse(element);
            }
        }
    });
}
