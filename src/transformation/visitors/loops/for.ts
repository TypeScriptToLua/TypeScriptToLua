import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { flatMap } from "../../../utils";
import { FunctionVisitor } from "../../context";
import { checkVariableDeclarationList, transformVariableDeclaration } from "../variable-declaration";
import { transformLoopBody } from "./body";

export const transformForStatement: FunctionVisitor<ts.ForStatement> = (statement, context) => {
    const result: lua.Statement[] = [];

    if (statement.initializer) {
        if (ts.isVariableDeclarationList(statement.initializer)) {
            checkVariableDeclarationList(statement.initializer);
            // local initializer = value
            result.push(...flatMap(statement.initializer.declarations, d => transformVariableDeclaration(context, d)));
        } else {
            result.push(...context.transformStatements(ts.createExpressionStatement(statement.initializer)));
        }
    }

    const condition = statement.condition
        ? context.transformExpression(statement.condition)
        : lua.createBooleanLiteral(true);

    // Add body
    const body: lua.Statement[] = transformLoopBody(context, statement);

    if (statement.incrementor) {
        body.push(...context.transformStatements(ts.createExpressionStatement(statement.incrementor)));
    }

    // while (condition) do ... end
    result.push(lua.createWhileStatement(lua.createBlock(body), condition));

    return lua.createDoStatement(result, statement);
};
