import * as ts from "typescript";
import * as lua from "../../LuaAST";
import * as utils from "../utils/helpers";
import { TransformationContext, Visitors } from "../context";
import { transformArrayBindingElement } from "../visitors/variable-declaration";
import { transformArguments } from "../visitors/call";
import { InvalidTupleFunctionUse } from "../utils/errors";
import { isSymbolAlias } from "../utils/symbols";

type VariableDeclarationWithCall = ts.VariableDeclaration & {
    initializer: ts.CallExpression;
};

type ReturnStatementWithCall = ts.ReturnStatement & {
    expression: ts.CallExpression;
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

function transformTupleHelperReturnStatement(
    context: TransformationContext,
    statement: ReturnStatementWithCall
): lua.Statement {
    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

function transformTupleHelperVariableDeclaration(
    context: TransformationContext,
    declaration: VariableDeclarationWithCall
): lua.Statement[] {
    if (!ts.isArrayBindingPattern(declaration.name)) {
        throw InvalidTupleFunctionUse(declaration.name);
    }

    const leftIdentifiers = declaration.name.elements.map(e => transformArrayBindingElement(context, e));
    const rightExpressions = isTupleHelperCallSignature(context, declaration.initializer)
        ? declaration.initializer.arguments.map(e => context.transformExpression(e))
        : context.transformExpression(declaration.initializer);
    return [lua.createVariableDeclarationStatement(leftIdentifiers, rightExpressions, declaration)];
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
};
