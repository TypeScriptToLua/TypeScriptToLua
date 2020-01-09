import * as ts from "typescript";
import * as lua from "../../LuaAST";
import * as utils from "../utils/helpers";
import { TransformationContext } from "../context";
import { transformArrayBindingElement } from "../visitors/variable-declaration";
import { transformArguments } from "../visitors/call";

export type VariableDeclarationWithCall = ts.VariableDeclaration & {
    initializer: ts.CallExpression;
};

export type ReturnStatementWithCall = ts.ReturnStatement & {
    expression: ts.CallExpression;
};

export function isTupleHelperType(context: TransformationContext, identifier: ts.Node): boolean {
    const type = context.checker.getTypeAtLocation(identifier);
    const sourceFiles = type.symbol?.declarations?.map(d => d.getSourceFile());
    return sourceFiles ? sourceFiles.some(file => utils.getHelperFileKind(file) === utils.HelperKind.Tuple) : false;
}

export function isTupleHelperReturnStatement(
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

export function transformTupleHelperReturnStatement(
    context: TransformationContext,
    statement: ReturnStatementWithCall
): lua.Statement {
    const expressions = transformArguments(context, statement.expression.arguments);
    return lua.createReturnStatement(expressions, statement);
}

export function isTupleHelperVariableDeclaration(
    context: TransformationContext,
    declaration: ts.VariableDeclaration
): declaration is VariableDeclarationWithCall {
    if (!declaration.initializer) {
        return false;
    }

    if (!ts.isCallExpression(declaration.initializer)) {
        return false;
    }

    return isTupleHelperType(context, declaration.initializer);
}

export function transformTupleHelperVariableDeclaration(
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
