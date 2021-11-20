import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { transformLuaLibFunction, LuaLibFeature } from "../utils/lualib";
import { unsupportedProperty } from "../utils/diagnostics";
import { isArrayType, isNumberType } from "../utils/typescript";
import { addToNumericExpression } from "../utils/lua-ast";
import { transformOptionalDeleteExpression } from "./optional-chaining";

export const transformDeleteExpression: FunctionVisitor<ts.DeleteExpression> = (node, context) => {
    const innerExpression = ts.skipParentheses(node.expression);
    if (ts.isOptionalChain(innerExpression)) {
        return transformOptionalDeleteExpression(context, node, innerExpression);
    }

    let ownerExpression: lua.Expression | undefined;
    let propertyExpression: lua.Expression | undefined;

    if (ts.isPropertyAccessExpression(innerExpression)) {
        if (ts.isPrivateIdentifier(innerExpression.name)) throw new Error("PrivateIdentifier is not supported");
        ownerExpression = context.transformExpression(innerExpression.expression);
        propertyExpression = lua.createStringLiteral(innerExpression.name.text);
    } else if (ts.isElementAccessExpression(innerExpression)) {
        ownerExpression = context.transformExpression(innerExpression.expression);
        propertyExpression = context.transformExpression(innerExpression.argumentExpression);

        const type = context.checker.getTypeAtLocation(innerExpression.expression);
        const argumentType = context.checker.getTypeAtLocation(innerExpression.argumentExpression);

        if (isArrayType(context, type) && isNumberType(context, argumentType)) {
            propertyExpression = addToNumericExpression(propertyExpression, 1);
        }
    }

    if (!ownerExpression || !propertyExpression) {
        context.diagnostics.push(unsupportedProperty(node, "delete", ts.SyntaxKind[node.kind]));
        return lua.createNilLiteral();
    }

    return transformLuaLibFunction(context, LuaLibFeature.Delete, node, ownerExpression, propertyExpression);
};
