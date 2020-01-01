import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { createModuleLocalNameIdentifier } from "../visitors/namespace";
import { createExportsIdentifier } from "./lua-ast";
import { getSymbolInfo } from "./symbols";
import { findFirstNodeAbove } from "./typescript";

export function hasDefaultExportModifier(node: ts.Node): boolean {
    return (node.modifiers ?? []).some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword);
}

export const createDefaultExportIdentifier = (original: ts.Node): lua.Identifier =>
    lua.createIdentifier("default", original);

export const createDefaultExportStringLiteral = (original: ts.Node): lua.StringLiteral =>
    lua.createStringLiteral("default", original);

export function getExportedSymbolDeclaration(symbol: ts.Symbol): ts.Declaration | undefined {
    const declarations = symbol.getDeclarations();
    if (declarations) {
        return declarations.find(d => (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) !== 0);
    }
}

export function getSymbolFromIdentifier(
    context: TransformationContext,
    identifier: lua.Identifier
): ts.Symbol | undefined {
    if (identifier.symbolId !== undefined) {
        const symbolInfo = getSymbolInfo(context, identifier.symbolId);
        if (symbolInfo !== undefined) {
            return symbolInfo.symbol;
        }
    }
}

export function getIdentifierExportScope(
    context: TransformationContext,
    identifier: lua.Identifier
): ts.SourceFile | ts.ModuleDeclaration | undefined {
    const symbol = getSymbolFromIdentifier(context, identifier);
    if (!symbol) {
        return undefined;
    }

    return getSymbolExportScope(context, symbol);
}

export function getSymbolExportScope(
    context: TransformationContext,
    symbol: ts.Symbol
): ts.SourceFile | ts.ModuleDeclaration | undefined {
    const exportedDeclaration = getExportedSymbolDeclaration(symbol);
    if (!exportedDeclaration) {
        return undefined;
    }

    const scope = findFirstNodeAbove(
        exportedDeclaration,
        (n): n is ts.SourceFile | ts.ModuleDeclaration => ts.isSourceFile(n) || ts.isModuleDeclaration(n)
    );
    if (!scope) {
        return undefined;
    }

    if (!isSymbolExportedFromScope(context, symbol, scope)) {
        return undefined;
    }

    return scope;
}

export function getExportedSymbolsFromScope(
    context: TransformationContext,
    scope: ts.SourceFile | ts.ModuleDeclaration
): ts.Symbol[] {
    const scopeSymbol = context.checker.getSymbolAtLocation(ts.isSourceFile(scope) ? scope : scope.name);
    if (scopeSymbol?.exports === undefined) {
        return [];
    }

    // ts.Iterator is not a ES6-compatible iterator, because TypeScript targets ES5
    const it: Iterable<ts.Symbol> = { [Symbol.iterator]: () => scopeSymbol!.exports!.values() };
    return [...it];
}

export function getDependenciesOfSymbol(context: TransformationContext, originalSymbol: ts.Symbol): ts.Symbol[] {
    return getExportedSymbolsFromScope(context, context.sourceFile).filter(exportSymbol =>
        exportSymbol.declarations
            .filter(ts.isExportSpecifier)
            .map(context.checker.getExportSpecifierLocalTargetSymbol)
            .includes(originalSymbol)
    );
}

export function isSymbolExported(context: TransformationContext, symbol: ts.Symbol): boolean {
    return (
        getExportedSymbolDeclaration(symbol) !== undefined ||
        // Symbol may have been exported separately (e.g. 'const foo = "bar"; export { foo }')
        isSymbolExportedFromScope(context, symbol, context.sourceFile)
    );
}

export function isSymbolExportedFromScope(
    context: TransformationContext,
    symbol: ts.Symbol,
    scope: ts.SourceFile | ts.ModuleDeclaration
): boolean {
    return getExportedSymbolsFromScope(context, scope).includes(symbol);
}

export function addExportToIdentifier(
    context: TransformationContext,
    identifier: lua.Identifier
): lua.AssignmentLeftHandSideExpression {
    const exportScope = getIdentifierExportScope(context, identifier);
    return exportScope ? createExportedIdentifier(context, identifier, exportScope) : identifier;
}

export function createExportedIdentifier(
    context: TransformationContext,
    identifier: lua.Identifier,
    exportScope?: ts.SourceFile | ts.ModuleDeclaration
): lua.AssignmentLeftHandSideExpression {
    if (!identifier.exportable) {
        return identifier;
    }

    const exportTable =
        exportScope && ts.isModuleDeclaration(exportScope)
            ? createModuleLocalNameIdentifier(context, exportScope)
            : createExportsIdentifier();

    return lua.createTableIndexExpression(exportTable, lua.createStringLiteral(identifier.text));
}
