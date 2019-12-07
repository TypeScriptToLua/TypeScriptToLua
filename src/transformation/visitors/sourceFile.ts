import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { InvalidJsonFileContent } from "../utils/errors";
import { createExportsIdentifier } from "../utils/lua-ast";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { hasExportEquals } from "../utils/typescript";

export const transformSourceFileNode: FunctionVisitor<ts.SourceFile> = (node, context) => {
    let statements: lua.Statement[] = [];
    if (node.flags & ts.NodeFlags.JsonFile) {
        const [statement] = node.statements;
        if (!statement || !ts.isExpressionStatement(statement)) {
            throw InvalidJsonFileContent(node);
        }

        statements.push(lua.createReturnStatement([context.transformExpression(statement.expression)]));
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

    return lua.createBlock(statements, node);
};
