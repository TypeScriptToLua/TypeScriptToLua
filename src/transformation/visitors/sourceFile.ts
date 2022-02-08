import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { SymbolId } from "../../LuaAST";
import { assert } from "../../utils";
import { FunctionVisitor } from "../context";
import { createExportsIdentifier } from "../utils/lua-ast";
import { getUsedLuaLibFeatures } from "../utils/lualib";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { hasExportEquals } from "../utils/typescript";
import { getSymbolIdOfSymbol, getSymbolInfo } from "../utils/symbols";
import { getExportedSymbolsFromScope } from "../utils/export";

export const transformSourceFileNode: FunctionVisitor<ts.SourceFile> = (node, context) => {
    let statements: lua.Statement[] = [];
    let exports: string[] | undefined;
    if (node.flags & ts.NodeFlags.JsonFile) {
        const [statement] = node.statements;
        if (statement) {
            assert(ts.isExpressionStatement(statement));
            const [precedingStatements, expression] = transformInPrecedingStatementScope(context, () =>
                context.transformExpression(statement.expression)
            );
            statements.push(...precedingStatements);
            statements.push(lua.createReturnStatement([expression]));
        } else {
            const errorCall = lua.createCallExpression(lua.createIdentifier("error"), [
                lua.createStringLiteral("Unexpected end of JSON input"),
            ]);

            statements.push(lua.createExpressionStatement(errorCall));
        }
    } else {
        pushScope(context, ScopeType.File);
        statements = performHoisting(context, context.transformStatements(node.statements));
        popScope(context);

        if (context.options.luaLibCompilation) {
            // Exports are currently assignment statements
            const exportedSymbolIds = getExportedSymbolsFromScope(context, context.sourceFile)
                .map(symbol => getSymbolIdOfSymbol(context, symbol))
                .filter(id => id !== undefined) as SymbolId[];
            const allStatementsAreExports = statements.every(
                s =>
                    lua.isAssignmentStatement(s) &&
                    s.left.every(l => lua.isIdentifier(l) && exportedSymbolIds.find(id => id === l.symbolId))
            );
            if (allStatementsAreExports) {
                // can convert all to variable declarations
                statements = statements.map(statement => {
                    assert(lua.isAssignmentStatement(statement));
                    return lua.createVariableDeclarationStatement(statement.left as lua.Identifier[], statement.right);
                });
            } else {
                // not all statements are exports
                // declare exports in variable declaration at top level, wrap statements in a do block
                // this is so that non-exported statements do not leak into scope
                const exportedIdentifiers = exportedSymbolIds.map(id =>
                    lua.createIdentifier(getSymbolInfo(context, id)!.symbol.getName())
                );
                statements = [
                    lua.createVariableDeclarationStatement(exportedIdentifiers),
                    lua.createDoStatement(statements),
                ];
            }
            exports = exportedSymbolIds.map(id => getSymbolInfo(context, id)!.symbol.getName());
        } else if (context.isModule) {
            // If export equals was not used. Create the exports table.
            // local ____exports = {}
            if (!hasExportEquals(node)) {
                statements.unshift(
                    lua.createVariableDeclarationStatement(createExportsIdentifier(), lua.createTableExpression())
                );
            }

            // return ____exports
            statements.push(lua.createReturnStatement([createExportsIdentifier()]));
        }
    }

    const trivia = node.getFullText().match(/^#!.*\r?\n/)?.[0] ?? "";
    return lua.createFile(statements, getUsedLuaLibFeatures(context), trivia, node, exports);
};
