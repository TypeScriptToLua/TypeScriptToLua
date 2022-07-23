import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { importLuaLibFeature, LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformArguments } from "../visitors/call";
import { isStandardLibraryType } from "../utils/typescript";

export function isPromiseClass(context: TransformationContext, node: ts.Identifier) {
    if (node.text !== "Promise") return false;
    const type = context.checker.getTypeAtLocation(node);
    return isStandardLibraryType(context, type, undefined);
}

export function createPromiseIdentifier(original: ts.Node) {
    return lua.createIdentifier("__TS__Promise", original);
}

export function transformPromiseConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "all":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseAll, node, ...params);
        case "allSettled":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseAllSettled, node, ...params);
        case "any":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseAny, node, ...params);
        case "race":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseRace, node, ...params);
        case "resolve":
            importLuaLibFeature(context, LuaLibFeature.Promise);
            return lua.createCallExpression(createStaticPromiseFunctionAccessor("resolve", calledMethod), params, node);
        case "reject":
            importLuaLibFeature(context, LuaLibFeature.Promise);
            return lua.createCallExpression(createStaticPromiseFunctionAccessor("reject", calledMethod), params, node);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Promise", expressionName));
    }
}

export function createStaticPromiseFunctionAccessor(functionName: string, node: ts.Node) {
    return lua.createTableIndexExpression(
        lua.createIdentifier("__TS__Promise"),
        lua.createStringLiteral(functionName),
        node
    );
}
