import * as ts from "typescript";
import * as lua from "../../LuaAST";
import * as utils from "../utils/helpers";
import { TransformationContext, Visitors } from "../context";
import { transformAssignmentLeftHandSideExpression } from "../visitors/binary-expression/assignments";
import { transformArrayBindingElement } from "../visitors/variable-declaration";
import { transformArguments } from "../visitors/call";
import { InvalidTupleFunctionUse } from "../utils/errors";
import { isSymbolAlias } from "../utils/symbols";
import { getDependenciesOfSymbol, createExportedIdentifier } from "../utils/export";

function isTupleHelperCallSignature(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return Boolean(type.symbol?.declarations?.some(isTupleHelperDeclaration));
}

function isTupleReturningCallExpression(context: TransformationContext, expression: ts.CallExpression): boolean {
    const signature = context.checker.getResolvedSignature(expression);
    return Boolean(signature?.getReturnType().aliasSymbol?.declarations?.some(isTupleHelperDeclaration));
}

function isTupleHelperNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return Boolean(type.symbol?.declarations?.some(isTupleHelperDeclaration));
}

function isTupleHelperDeclaration(declaration: ts.Declaration): boolean {
    return utils.getHelperFileKind(declaration.getSourceFile()) === utils.HelperKind.Tuple;
}

function transformTupleHelperReturnStatement(
    context: TransformationContext,
    statement: ts.ReturnStatement
): lua.Statement | undefined {
    if (!statement.expression) {
        return undefined;
    }

    if (!ts.isCallExpression(statement.expression)) {
        return undefined;
    }

    if (!isTupleHelperCallSignature(context, statement.expression)) {
        return undefined;
    }

    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

function transformTupleCallArguments(
    context: TransformationContext,
    expression: ts.CallExpression
): lua.Expression[] | lua.Expression {
    return isTupleHelperCallSignature(context, expression)
        ? expression.arguments.length > 0
            ? expression.arguments.map(e => context.transformExpression(e))
            : lua.createNilLiteral(expression)
        : context.transformExpression(expression);
}

function transformTupleHelperVariableDeclaration(
    context: TransformationContext,
    declaration: ts.VariableDeclaration
): lua.Statement[] | undefined {
    if (!declaration.initializer) {
        return undefined;
    }

    if (!ts.isCallExpression(declaration.initializer)) {
        return undefined;
    }

    if (!isTupleReturningCallExpression(context, declaration.initializer)) {
        return undefined;
    }

    if (!ts.isArrayBindingPattern(declaration.name)) {
        throw InvalidTupleFunctionUse(declaration.name);
    }

    if (declaration.name.elements.length < 1) {
        throw InvalidTupleFunctionUse(declaration.name);
    }

    if (declaration.name.elements.some(ts.isBinaryExpression)) {
        throw InvalidTupleFunctionUse(declaration.name);
    }

    const leftIdentifiers = declaration.name.elements.map(e => transformArrayBindingElement(context, e));
    const rightExpressions = transformTupleCallArguments(context, declaration.initializer);
    return [lua.createVariableDeclarationStatement(leftIdentifiers, rightExpressions, declaration)];
}

function isSimpleLeftHandSideDestructuringExpression(expression: ts.Expression): boolean {
    if (ts.isBinaryExpression(expression)) {
        return false;
    }

    return true;
}

function transformTupleHelperDestructuringAssignmentStatement(
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

    if (!isTupleReturningCallExpression(context, statement.expression.right)) {
        return undefined;
    }

    if (!ts.isArrayLiteralExpression(statement.expression.left)) {
        throw InvalidTupleFunctionUse(statement.expression.left);
    }

    if (statement.expression.left.elements.length < 1) {
        throw InvalidTupleFunctionUse(statement.expression.left);
    }

    if (!statement.expression.left.elements.every(isSimpleLeftHandSideDestructuringExpression)) {
        throw InvalidTupleFunctionUse(statement.expression.left);
    }

    const transformLeft = (expression: ts.Expression): lua.AssignmentLeftHandSideExpression => {
        if (ts.isOmittedExpression(expression)) {
            return lua.createAnonymousIdentifier(expression);
        } else {
            return transformAssignmentLeftHandSideExpression(context, expression);
        }
    };

    const leftIdentifiers = statement.expression.left.elements.map(transformLeft);

    const rightExpressions = transformTupleCallArguments(context, statement.expression.right);

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

export const tupleVisitors: Visitors = {
    [ts.SyntaxKind.ImportSpecifier]: (node, context) => {
        if (isTupleHelperNode(context, node)) {
            return;
        }
        return context.superTransformNode(node);
    },
    [ts.SyntaxKind.ReturnStatement]: (node, context) => {
        const result = transformTupleHelperReturnStatement(context, node);
        return result ? result : context.superTransformStatements(node);
    },
    [ts.SyntaxKind.VariableDeclaration]: (node, context) => {
        const result = transformTupleHelperVariableDeclaration(context, node);
        return result ? result : context.superTransformNode(node);
    },
    [ts.SyntaxKind.ExpressionStatement]: (node, context) => {
        const result = transformTupleHelperDestructuringAssignmentStatement(context, node);
        return result ? result : context.superTransformStatements(node);
    },
    [ts.SyntaxKind.Identifier]: (node, context) => {
        if (isTupleHelperNode(context, node)) {
            throw InvalidTupleFunctionUse(node);
        }
        return context.superTransformExpression(node);
    },
    [ts.SyntaxKind.ObjectLiteralExpression]: (node, context) => {
        node.properties.filter(ts.isShorthandPropertyAssignment).forEach(element => {
            const valueSymbol = context.checker.getShorthandAssignmentValueSymbol(element);
            if (valueSymbol && isSymbolAlias(valueSymbol)) {
                const declaration = context.checker.getAliasedSymbol(valueSymbol).valueDeclaration;
                if (declaration && isTupleHelperDeclaration(declaration)) {
                    throw InvalidTupleFunctionUse(element);
                }
            }
        });
        return context.superTransformExpression(node);
    },
};
