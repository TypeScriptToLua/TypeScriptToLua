import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression, transformArguments } from "../transformers/call";
import { UnsupportedProperty } from "../utils/errors";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

// Transpile a Number._ property
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
