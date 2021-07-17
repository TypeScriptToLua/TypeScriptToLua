import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { importLuaLibFeature, LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformNewPromise(
    context: TransformationContext,
    node: ts.NewExpression,
    args: lua.Expression[]
): lua.Expression {
    importLuaLibFeature(context, LuaLibFeature.Promise);

    const name = lua.createIdentifier("__TS__Promise", node.expression);
    return transformLuaLibFunction(context, LuaLibFeature.New, node, name, ...args);
}

export function transformPromiseConstructorCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression | undefined {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    switch (expressionName) {
        case "all":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseAll, node, ...params);
        case "any":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseAny, node, ...params);
        case "race":
            return transformLuaLibFunction(context, LuaLibFeature.PromiseRace, node, ...params);
        case "resolve":
            importLuaLibFeature(context, LuaLibFeature.Promise);
            return lua.createCallExpression(
                lua.createTableIndexExpression(
                    lua.createIdentifier("__TS__Promise"),
                    lua.createStringLiteral("resolve"),
                    expression
                ),
                params,
                node
            );
        case "reject":
            importLuaLibFeature(context, LuaLibFeature.Promise);
            return lua.createCallExpression(
                lua.createTableIndexExpression(
                    lua.createIdentifier("__TS__Promise"),
                    lua.createStringLiteral("reject"),
                    expression
                ),
                params,
                node
            );
        default:
            context.diagnostics.push(unsupportedProperty(expression.name, "Promise", expressionName));
    }
}
