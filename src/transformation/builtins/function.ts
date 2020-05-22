import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty, unsupportedSelfFunctionConversion } from "../utils/diagnostics";
import { ContextType, getFunctionContextType } from "../utils/function-context";
import { createUnpackCall } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformFunctionPrototypeCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.CallExpression | undefined {
    const expression = node.expression;
    const callerType = context.checker.getTypeAtLocation(expression.expression);
    if (getFunctionContextType(context, callerType) === ContextType.Void) {
        context.diagnostics.push(unsupportedSelfFunctionConversion(node));
    }

    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(expression.expression);
    const expressionName = expression.name.text;
    switch (expressionName) {
        case "apply":
            return lua.createCallExpression(
                caller,
                [params[0], createUnpackCall(context, params[1], node.arguments[1])],
                node
            );
        case "bind":
            return transformLuaLibFunction(context, LuaLibFeature.FunctionBind, node, caller, ...params);
        case "call":
            return lua.createCallExpression(caller, params, node);
        default:
            context.diagnostics.push(unsupportedProperty(expression.name, "function", expressionName));
    }
}
