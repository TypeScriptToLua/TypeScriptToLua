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

type VariableDeclarationWithCall = ts.VariableDeclaration & {
    initializer: ts.CallExpression;
};

type ReturnStatementWithCall = ts.ReturnStatement & {
    expression: ts.CallExpression;
};

type ExpressionStatementWithDestructuringAssignment = ts.ExpressionStatement & {
    expression: {
        left: ts.Expression;
        right: ts.CallExpression;
    };
};

function isTupleHelperCallSignature(context: TransformationContext, expression: ts.CallExpression): boolean {
    const type = context.checker.getTypeAtLocation(expression.expression);
    return type.symbol?.declarations?.some(isTupleHelperDeclaration) ? true : false;
}

function isTupleReturningCallExpression(context: TransformationContext, expression: ts.CallExpression): boolean {
    const signature = context.checker.getResolvedSignature(expression);
    return signature?.getReturnType().aliasSymbol?.declarations?.some(isTupleHelperDeclaration) ? true : false;
}

function isTupleHelperDeclaration(declaration: ts.Declaration): boolean {
    return utils.getHelperFileKind(declaration.getSourceFile()) === utils.HelperKind.Tuple;
}

function isTupleHelperNode(context: TransformationContext, node: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(node);
    return type.symbol?.declarations?.some(isTupleHelperDeclaration) ? true : false;
}

function isTupleHelperReturnStatement(
    context: TransformationContext,
    statement: ts.ReturnStatement
): statement is ReturnStatementWithCall {
    if (!statement.expression) {
        return false;
    }

    if (!ts.isCallExpression(statement.expression)) {
        return false;
    }

    return isTupleHelperCallSignature(context, statement.expression);
}

function isTupleHelperVariableDeclaration(
    context: TransformationContext,
    declaration: ts.VariableDeclaration
): declaration is VariableDeclarationWithCall {
    if (!declaration.initializer) {
        return false;
    }

    if (!ts.isCallExpression(declaration.initializer)) {
        return false;
    }

    return isTupleReturningCallExpression(context, declaration.initializer);
}

function isTupleHelperDestructuringAssignmentStatement(
    context: TransformationContext,
    statement: ts.ExpressionStatement
): statement is ExpressionStatementWithDestructuringAssignment {
    if (!ts.isBinaryExpression(statement.expression)) {
        return false;
    }

    if (statement.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return false;
    }

    if (!ts.isCallExpression(statement.expression.right)) {
        return false;
    }

    return isTupleReturningCallExpression(context, statement.expression.right);
}

function transformTupleHelperReturnStatement(
    context: TransformationContext,
    statement: ReturnStatementWithCall
): lua.Statement {
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

function isSimpleArrayBindingElement(element: ts.ArrayBindingElement): boolean {
    if (ts.isOmittedExpression(element)) {
        return true;
    }

    if (ts.isBindingElement(element) && !element.initializer) {
        return true;
    }

    return false;
}

function transformTupleHelperVariableDeclaration(
    context: TransformationContext,
    declaration: VariableDeclarationWithCall
): lua.Statement[] {
    if (!ts.isArrayBindingPattern(declaration.name)) {
        throw InvalidTupleFunctionUse(declaration.name);
    }

    if (declaration.name.elements.length < 1) {
        throw InvalidTupleFunctionUse(declaration.name);
    }

    if (!declaration.name.elements.every(isSimpleArrayBindingElement)) {
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
    statement: ExpressionStatementWithDestructuringAssignment
): lua.Statement[] {
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

    const trailingStatements = statement.expression.left.elements
        .map(expression => {
            const symbol = context.checker.getSymbolAtLocation(expression);
            const dependentSymbols = symbol ? getDependenciesOfSymbol(context, symbol) : [];
            return dependentSymbols.map(symbol => {
                const identifierToAssign = createExportedIdentifier(context, lua.createIdentifier(symbol.name));
                return lua.createAssignmentStatement(identifierToAssign, transformLeft(expression));
            });
        })
        .flat();

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
        if (isTupleHelperReturnStatement(context, node)) {
            return transformTupleHelperReturnStatement(context, node);
        }
        return context.superTransformStatements(node);
    },
    [ts.SyntaxKind.Identifier]: (node, context) => {
        if (isTupleHelperNode(context, node)) {
            throw InvalidTupleFunctionUse(node);
        }
        return context.superTransformExpression(node);
    },
    [ts.SyntaxKind.VariableDeclaration]: (node, context) => {
        if (isTupleHelperVariableDeclaration(context, node)) {
            return transformTupleHelperVariableDeclaration(context, node);
        }
        return context.superTransformNode(node);
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
    [ts.SyntaxKind.ExpressionStatement]: (node, context) => {
        if (isTupleHelperDestructuringAssignmentStatement(context, node)) {
            return transformTupleHelperDestructuringAssignmentStatement(context, node);
        }
        return context.superTransformStatements(node);
    },
};
