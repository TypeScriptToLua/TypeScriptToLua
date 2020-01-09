import * as ts from "typescript";
import * as path from "path";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { transformArrayBindingElement } from "../visitors/variable-declaration";
import { transformArguments } from "../visitors/call";

function isSourceFileFromHelpers(sourceFile: ts.SourceFile): boolean {
    const helperDirectory = path.resolve(__dirname, "../../helpers");
    const sourceFileDirectory = path.dirname(path.normalize(sourceFile.fileName));
    return helperDirectory === sourceFileDirectory;
}

export function isHelpersImport(
    context: TransformationContext,
    importNode: ts.ImportClause | ts.ImportSpecifier | ts.ImportDeclaration
): boolean {
    if (ts.isImportDeclaration(importNode)) {
        const symbol = context.checker.getSymbolAtLocation(importNode.moduleSpecifier);
        return symbol?.declarations.map(d => d.getSourceFile()).some(isSourceFileFromHelpers) ?? false;
    }

    if (importNode.name) {
        const symbol = context.checker.getSymbolAtLocation(importNode.name);
        if (symbol) {
            const originalSymbol = context.checker.getAliasedSymbol(symbol);
            return originalSymbol?.declarations?.map(d => d.getSourceFile()).some(isSourceFileFromHelpers) ?? false;
        }
    }

    return false;
}

export type VariableDeclarationWithCall = ts.VariableDeclaration & {
    initializer: ts.CallExpression;
};

export type ReturnStatementWithCall = ts.ReturnStatement & {
    expression: ts.CallExpression;
};

export function hasTupleHelperSignature(context: TransformationContext, expression: ts.CallExpression): boolean {
    const signature = context.checker.getResolvedSignature(expression);
    const sourceFile = signature?.declaration?.getSourceFile();
    return sourceFile ? isSourceFileFromHelpers(sourceFile) : false;
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

    return hasTupleHelperSignature(context, statement.expression);
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

    return hasTupleHelperSignature(context, declaration.initializer);
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
