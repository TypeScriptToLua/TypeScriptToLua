import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import * as utils from "../../utils/helpers";
import { isNonNull } from "../../../utils";
import { TransformationContext } from "../../context";
import { transformAssignmentLeftHandSideExpression } from "../binary-expression/assignments";
import { transformIdentifier } from "../identifier";
import { transformArguments } from "../call";
import { getDependenciesOfSymbol, createExportedIdentifier } from "../../utils/export";
import { createLocalOrExportedOrGlobalDeclaration } from "../../utils/lua-ast";
import {
    invalidMultiHelperFunctionUse,
    unsupportedMultiFunctionAssignment,
} from "../../../transformation/utils/diagnostics";

const isMultiHelperDeclaration = (context: TransformationContext) => (declaration: ts.Declaration): boolean => {
    return utils.getHelperFileKind(context, declaration.getSourceFile()) === utils.HelperKind.Multi;
};

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
    if (!declaration.initializer) return;
    if (!isMultiReturnCall(context, declaration.initializer)) return;

    if (!ts.isArrayBindingPattern(declaration.name) || declaration.name.elements.length < 1) {
        context.diagnostics.push(invalidMultiHelperFunctionUse(declaration.name));
        return [];
    }

    const leftIdentifiers = declaration.name.elements
        .map(element => {
            if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
                return transformIdentifier(context, element.name);
            }

            if (ts.isOmittedExpression(element)) {
                return lua.createAnonymousIdentifier(element);
            }

            context.diagnostics.push(unsupportedMultiFunctionAssignment(element));
        })
        .filter(isNonNull);

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

    if (
        !ts.isArrayLiteralExpression(statement.expression.left) ||
        statement.expression.left.elements.length < 1 ||
        statement.expression.left.elements.some(ts.isBinaryExpression)
    ) {
        context.diagnostics.push(invalidMultiHelperFunctionUse(statement.expression.left));
        return [];
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
                    context.diagnostics.push(invalidMultiHelperFunctionUse(element));
                    return element;
                }
            }
        })
        .filter(isNonNull);
}
