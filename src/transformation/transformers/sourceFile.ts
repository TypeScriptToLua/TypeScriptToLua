import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { FunctionVisitor, TransformerPlugin } from "../context";
import { InvalidJsonFileContent } from "../utils/errors";
import { createExportsIdentifier } from "../utils/lua-ast";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { hasExportEquals } from "../utils/typescript";

const transformSourceFile: FunctionVisitor<ts.SourceFile> = (node, context) => {
    let statements: tstl.Statement[] = [];
    if (node.flags & ts.NodeFlags.JsonFile) {
        const [statement] = node.statements;
        if (!statement || !ts.isExpressionStatement(statement)) {
            throw InvalidJsonFileContent(node);
        }

        statements.push(tstl.createReturnStatement([context.transformExpression(statement.expression)]));
    } else {
        pushScope(context, ScopeType.File);
        statements = performHoisting(context, context.transformStatements(node.statements));
        popScope(context);

        if (context.isModule) {
            // If export equals was not used. Create the exports table.
            // local ____exports = {}
            if (!hasExportEquals(node)) {
                statements.unshift(
                    tstl.createVariableDeclarationStatement(createExportsIdentifier(), tstl.createTableExpression())
                );
            }

            // return ____exports
            statements.push(tstl.createReturnStatement([createExportsIdentifier()]));
        }
    }

    return tstl.createBlock(statements, node);
};

export const sourceFilePlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.SourceFile]: transformSourceFile,
    },
};
