import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformNumberPrototypeCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression | undefined {
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
            context.diagnostics.push(unsupportedProperty(expression.name, "number", expressionName));
    }
}

export function transformNumberConstructorCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): lua.CallExpression | undefined {
    const method = expression.expression;
    const parameters = transformArguments(context, expression.arguments);
    const methodName = method.name.text;
    switch (methodName) {
        case "isNaN":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsNaN, expression, ...parameters);
        case "isFinite":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsFinite, expression, ...parameters);
        default:
            context.diagnostics.push(unsupportedProperty(method.name, "Number", methodName));
    }
}
