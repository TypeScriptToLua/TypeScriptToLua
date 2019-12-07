import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformObjectConstructorCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): lua.Expression {
    const method = expression.expression;
    const parameters = transformArguments(context, expression.arguments);
    const methodName = method.name.text;

    switch (methodName) {
        case "assign":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectAssign, expression, ...parameters);
        case "entries":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectEntries, expression, ...parameters);
        case "fromEntries":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectFromEntries, expression, ...parameters);
        case "keys":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectKeys, expression, ...parameters);
        case "values":
            return transformLuaLibFunction(context, LuaLibFeature.ObjectValues, expression, ...parameters);
        default:
            throw UnsupportedProperty("Object", methodName, expression);
    }
}

export function transformObjectPrototypeCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression | undefined {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);

    const name = expression.name.text;
    switch (name) {
        case "toString":
            const toStringIdentifier = lua.createIdentifier("tostring");
            return lua.createCallExpression(
                toStringIdentifier,
                [context.transformExpression(expression.expression)],
                node
            );
        case "hasOwnProperty":
            const expr = context.transformExpression(expression.expression);
            const parameters = transformArguments(context, node.arguments, signature);
            const rawGetIdentifier = lua.createIdentifier("rawget");
            const rawGetCall = lua.createCallExpression(rawGetIdentifier, [expr, ...parameters]);
            return lua.createParenthesizedExpression(
                lua.createBinaryExpression(rawGetCall, lua.createNilLiteral(), lua.SyntaxKind.InequalityOperator, node)
            );
    }
}
