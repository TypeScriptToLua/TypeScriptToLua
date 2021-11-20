import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { FunctionVisitor } from "../context/visitors";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void
export const transformVoidExpression: FunctionVisitor<ts.VoidExpression> = (node, context) => {
    // If content is a literal it is safe to replace the entire expression with nil
    if (!ts.isLiteralExpression(node.expression)) {
        // local ____ = <expression>
        context.addPrecedingStatements(
            lua.createVariableDeclarationStatement(
                lua.createAnonymousIdentifier(),
                context.transformExpression(node.expression)
            )
        );
    }

    return lua.createNilLiteral(node);
};

export const transformVoidExpressionStatement = (node: ts.VoidExpression, context: TransformationContext) =>
    // In case of a void expression statement we can omit the IIFE
    lua.createVariableDeclarationStatement(
        lua.createAnonymousIdentifier(),
        context.transformExpression(node.expression),
        node
    );
