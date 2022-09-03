import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedForTarget, unsupportedProperty, unsupportedSelfFunctionConversion } from "../utils/diagnostics";
import { ContextType, getFunctionContextType } from "../utils/function-context";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformCallAndArguments } from "../visitors/call";
import { createUnpackCall } from "../utils/lua-ast";

export function transformFunctionPrototypeCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.CallExpression | undefined {
    const callerType = context.checker.getTypeAtLocation(calledMethod.expression);
    if (getFunctionContextType(context, callerType) === ContextType.Void) {
        context.diagnostics.push(unsupportedSelfFunctionConversion(node));
    }

    const signature = context.checker.getResolvedSignature(node);
    const [caller, params] = transformCallAndArguments(context, calledMethod.expression, node.arguments, signature);
    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "apply":
            const nonContextArgs = params.length > 1 ? [createUnpackCall(context, params[1], node.arguments[1])] : [];
            return lua.createCallExpression(caller, [params[0], ...nonContextArgs], node);
        case "bind":
            return transformLuaLibFunction(context, LuaLibFeature.FunctionBind, node, caller, ...params);
        case "call":
            return lua.createCallExpression(caller, params, node);
        case "toString":
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "function", expressionName));
    }
}

export function transformFunctionProperty(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    switch (node.name.text) {
        case "length":
            if (
                context.luaTarget === LuaTarget.Lua50 ||
                context.luaTarget === LuaTarget.Lua51 ||
                context.luaTarget === LuaTarget.Universal
            ) {
                context.diagnostics.push(unsupportedForTarget(node, "function.length", context.luaTarget));
            }

            // debug.getinfo(fn)
            const getInfoCall = lua.createCallExpression(
                lua.createTableIndexExpression(lua.createIdentifier("debug"), lua.createStringLiteral("getinfo")),
                [context.transformExpression(node.expression)]
            );

            const nparams = lua.createTableIndexExpression(getInfoCall, lua.createStringLiteral("nparams"));

            const contextType = getFunctionContextType(context, context.checker.getTypeAtLocation(node.expression));
            return contextType === ContextType.NonVoid
                ? lua.createBinaryExpression(nparams, lua.createNumericLiteral(1), lua.SyntaxKind.SubtractionOperator)
                : nparams;

        case "arguments":
        case "caller":
        case "displayName":
        case "name":
            context.diagnostics.push(unsupportedProperty(node.name, "function", node.name.text));
    }
}
