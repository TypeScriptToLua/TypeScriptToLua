import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context/visitors";
import { createImmediatelyInvokedFunctionExpression } from "../utils/lua-ast";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void
export const transformVoidExpression: FunctionVisitor<ts.VoidExpression> = (node, context) =>
    // (function() local ____ = <expression> end)()
    createImmediatelyInvokedFunctionExpression(
        [
            lua.createVariableDeclarationStatement(
                lua.createAnonymousIdentifier(),
                context.transformExpression(node.expression)
            ),
        ],
        [],
        node
    );
