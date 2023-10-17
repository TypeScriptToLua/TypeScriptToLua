import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { assert } from "../../utils";
import { FunctionVisitor } from "../context";
import { AnnotationKind, getFileAnnotations } from "../utils/annotations";
import { createDefaultExportStringLiteral } from "../utils/export";
import { createExportsIdentifier, createUnpackCall } from "../utils/lua-ast";
import { transformInPrecedingStatementScope } from "../utils/preceding-statements";
import { performHoisting, ScopeType } from "../utils/scope";
import { hasExportEquals } from "../utils/typescript";

export const transformSourceFileNode: FunctionVisitor<ts.SourceFile> = (node, context) => {
    let statements: lua.Statement[] = [];
    if (node.flags & ts.NodeFlags.JsonFile) {
        const [statement] = node.statements;
        if (statement) {
            assert(ts.isExpressionStatement(statement));
            const { precedingStatements, result: expression } = transformInPrecedingStatementScope(context, () =>
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
        context.pushScope(ScopeType.File);

        statements = performHoisting(context, context.transformStatements(node.statements));
        context.popScope();

        if (context.isModule) {
            // If export equals was not used. Create the exports table.
            // local ____exports = {}
            if (!hasExportEquals(node)) {
                statements.unshift(
                    lua.createVariableDeclarationStatement(createExportsIdentifier(), lua.createTableExpression())
                );
            }

            // return ____exports (or unpack(____exports.default))
            const toReturn: lua.Expression = getFileAnnotations(node).has(AnnotationKind.ReturnDefaultExport)
                ? createUnpackCall(
                      context,
                      lua.createTableIndexExpression(createExportsIdentifier(), createDefaultExportStringLiteral())
                  )
                : createExportsIdentifier();
            statements.push(lua.createReturnStatement([toReturn]));
        }
    }

    const trivia = node.getFullText().match(/^#!.*\r?\n/)?.[0] ?? "";
    return lua.createFile(statements, context.usedLuaLibFeatures, trivia, node);
};
