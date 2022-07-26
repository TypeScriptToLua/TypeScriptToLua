import * as ts from "typescript";
import * as lua from "../../LuaAST";

export function createImportsIdentifier(): lua.Identifier {
    return lua.createIdentifier("____imports");
}

export function isSymbolImported(symbol: ts.Symbol): boolean {
    return symbol.declarations?.some(d => ts.isImportSpecifier(d) || ts.isNamespaceImport(d)) ?? false;
}

export function createImportedIdentifier(luaIdentifier: lua.Identifier, node: ts.Node): lua.AssignmentLeftHandSideExpression {
    const importsTable = lua.createIdentifier("____imports");
    return lua.createTableIndexExpression(importsTable, lua.createStringLiteral(luaIdentifier.text), node);
}
