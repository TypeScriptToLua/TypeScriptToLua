import ts = require("typescript");
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformArguments } from "../visitors/call";

export function transformNumberPrototypeCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(calledMethod.expression);

    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "toString":
            return params.length === 0
                ? lua.createCallExpression(lua.createIdentifier("tostring"), [caller], node)
                : transformLuaLibFunction(context, LuaLibFeature.NumberToString, node, caller, ...params);
        case "toFixed":
            return transformLuaLibFunction(context, LuaLibFeature.NumberToFixed, node, caller, ...params);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "number", expressionName));
    }
}

export function transformNumberConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.CallExpression | undefined {
    const parameters = transformArguments(context, node.arguments);
    const methodName = calledMethod.name.text;
    switch (methodName) {
        case "isNaN":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsNaN, node, ...parameters);
        case "isFinite":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsFinite, node, ...parameters);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Number", methodName));
    }
}
