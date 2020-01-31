import * as ts from "typescript";
import * as lua from "../../LuaAST";
import * as utils from "../utils/helpers";
import { TransformationContext, Visitors } from "../context";
import { transformArrayBindingElement } from "../visitors/variable-declaration";
import { transformArguments } from "../visitors/call";
import { InvalidTupleFunctionUse } from '../utils/errors';
import { resolveSymbolDeclaration } from '../utils/symbols';

type VariableDeclarationWithCall = ts.VariableDeclaration & {
    initializer: ts.CallExpression;
};

type ReturnStatementWithCall = ts.ReturnStatement & {
    expression: ts.CallExpression;
};

function isTupleHelperType(context: TransformationContext, identifier: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(identifier);
    const sourceFiles = type.symbol?.declarations?.map(d => d.getSourceFile());
    return sourceFiles ? sourceFiles.some(file => utils.getHelperFileKind(file) === utils.HelperKind.Tuple) : false;
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

    return isTupleHelperType(context, statement.expression.expression);
}

function transformTupleHelperReturnStatement(
    context: TransformationContext,
    statement: ReturnStatementWithCall
): lua.Statement {
    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
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

    return isTupleHelperType(context, declaration.initializer.expression);
}

function transformTupleHelperVariableDeclaration(
    context: TransformationContext,
    declaration: VariableDeclarationWithCall
): lua.Statement[] {
    if (!ts.isArrayBindingPattern(declaration.name)) {
        throw Error();
    }

    const leftIdentifiers = declaration.name.elements.map(e => transformArrayBindingElement(context, e));
    const rightExpressions = declaration.initializer.arguments.map(e => context.transformExpression(e));
    return [lua.createVariableDeclarationStatement(leftIdentifiers, rightExpressions, declaration)];
}

export const tupleVisitors: Visitors = {
    [ts.SyntaxKind.ImportSpecifier]: (node, context) => {
        if (isTupleHelperType(context, node)) {
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
        if (isTupleHelperType(context, node)) {
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
            if (valueSymbol) {
                const declaration = resolveSymbolDeclaration(valueSymbol);
                if (declaration && isTupleHelperType(context, declaration)) {
                    throw InvalidTupleFunctionUse(element);
                }
            }
        });
        return context.superTransformExpression(node);
    }
};
