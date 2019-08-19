import * as ts from "typescript";
import * as tstl from "../../../LuaAST";
import { flatMap } from "../../../utils";
import { FunctionVisitor, TransformerPlugin } from "../../context";
import { transformVariableDeclaration } from "../variable";
import { transformLoopBody } from "./body";

const transformForStatement: FunctionVisitor<ts.ForStatement> = (statement, context) => {
    const result: tstl.Statement[] = [];

    if (statement.initializer) {
        if (ts.isVariableDeclarationList(statement.initializer)) {
            // local initializer = value
            result.push(...flatMap(statement.initializer.declarations, d => transformVariableDeclaration(context, d)));
        } else {
            result.push(...context.transformStatements(ts.createExpressionStatement(statement.initializer)));
        }
    }

    const condition = statement.condition
        ? context.transformExpression(statement.condition)
        : tstl.createBooleanLiteral(true);

    // Add body
    const body: tstl.Statement[] = transformLoopBody(context, statement);

    if (statement.incrementor) {
        body.push(...context.transformStatements(ts.createExpressionStatement(statement.incrementor)));
    }

    // while (condition) do ... end
    result.push(tstl.createWhileStatement(tstl.createBlock(body), condition));

    return tstl.createDoStatement(result, statement);
};

export const forPlugin: TransformerPlugin = {
    visitors: {
        [ts.SyntaxKind.ForStatement]: transformForStatement,
    },
};
