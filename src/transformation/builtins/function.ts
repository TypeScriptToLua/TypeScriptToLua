import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression, transformArguments } from "../transformers/call";
import { UnsupportedProperty, UnsupportedSelfFunctionConversion } from "../utils/errors";
import { ContextType, getFunctionContextType } from "../utils/function-context";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

export function transformFunctionCall(
    context: TransformationContext,
    node: PropertyCallExpression
): tstl.CallExpression {
    const expression = node.expression;
    const callerType = context.checker.getTypeAtLocation(expression.expression);
    if (getFunctionContextType(context, callerType) === ContextType.Void) {
        throw UnsupportedSelfFunctionConversion(node);
    }

    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(expression.expression);
    const expressionName = expression.name.text;
    switch (expressionName) {
        case "apply":
            return transformLuaLibFunction(context, LuaLibFeature.FunctionApply, node, caller, ...params);
        case "bind":
            return transformLuaLibFunction(context, LuaLibFeature.FunctionBind, node, caller, ...params);
        case "call":
            return transformLuaLibFunction(context, LuaLibFeature.FunctionCall, node, caller, ...params);
        default:
            throw UnsupportedProperty("function", expressionName, node);
    }
}
