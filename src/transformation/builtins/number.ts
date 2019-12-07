import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformNumberPrototypeCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(expression.expression);

    const expressionName = expression.name.text;
    switch (expressionName) {
        case "toString":
            return params.length === 0
                ? lua.createCallExpression(lua.createIdentifier("tostring"), [caller], node)
                : transformLuaLibFunction(context, LuaLibFeature.NumberToString, node, caller, ...params);
        default:
            throw UnsupportedProperty("number", expressionName, node);
    }
}

export function transformNumberConstructorCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): lua.CallExpression {
    const method = expression.expression;
    const parameters = transformArguments(context, expression.arguments);
    const methodName = method.name.text;
    switch (methodName) {
        case "isNaN":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsNaN, expression, ...parameters);
        case "isFinite":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsFinite, expression, ...parameters);
        default:
            throw UnsupportedProperty("Number", methodName, expression);
    }
}
