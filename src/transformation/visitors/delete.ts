import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { transformLuaLibFunction, LuaLibFeature } from "../utils/lualib";
import { unsupportedProperty } from "../utils/diagnostics";
import { isArrayType, isNumberType } from "../utils/typescript";
import { addToNumericExpression } from "../utils/lua-ast";

export const transformDeleteExpression: FunctionVisitor<ts.DeleteExpression> = (node, context) => {
    let ownerExpression: lua.Expression | undefined;
    let propertyExpression: lua.Expression | undefined;

    if (ts.isPropertyAccessExpression(node.expression)) {
        if (ts.isPrivateIdentifier(node.expression.name)) throw new Error("PrivateIdentifier is not supported");
        ownerExpression = context.transformExpression(node.expression.expression);
        propertyExpression = lua.createStringLiteral(node.expression.name.text);
    } else if (ts.isElementAccessExpression(node.expression)) {
        ownerExpression = context.transformExpression(node.expression.expression);
        propertyExpression = context.transformExpression(node.expression.argumentExpression);

        const type = context.checker.getTypeAtLocation(node.expression.expression);
        const argumentType = context.checker.getTypeAtLocation(node.expression.argumentExpression);

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
