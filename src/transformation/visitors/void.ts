import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { wrapInStatement } from "./expression-statement";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void
export const transformVoidExpression: FunctionVisitor<ts.VoidExpression> = (node, context) => {
    // If content is a literal it is safe to replace the entire expression with nil
    if (!ts.isLiteralExpression(node.expression)) {
        const statements = wrapInStatement(context.transformExpression(node.expression));
        if (statements) context.addPrecedingStatements(statements);
    }

    return lua.createNilLiteral();
};
