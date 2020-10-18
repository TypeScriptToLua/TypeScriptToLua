import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { assert } from "../../utils";
import { FunctionVisitor } from "../context";
import { createExportsIdentifier } from "../utils/lua-ast";
import { getUsedLuaLibFeatures } from "../utils/lualib";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { hasExportEquals } from "../utils/typescript";

export const transformSourceFileNode: FunctionVisitor<ts.SourceFile> = (node, context) => {
    let statements: lua.Statement[] = [];
    if (node.flags & ts.NodeFlags.JsonFile) {
        const [statement] = node.statements;
        if (statement) {
            assert(ts.isExpressionStatement(statement));
            statements.push(lua.createReturnStatement([context.transformExpression(statement.expression)]));
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

        if (context.isModule) {
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
    return lua.createFile(statements, getUsedLuaLibFeatures(context), trivia, node);
};
