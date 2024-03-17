import * as lua from "../../LuaAST";
import * as ts from "typescript";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { transformArguments } from "../visitors/call";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

export function transformMapConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const args = transformArguments(context, node.arguments);
    const methodName = calledMethod.name.text;

    switch (methodName) {
        case "groupBy":
            return transformLuaLibFunction(context, LuaLibFeature.MapGroupBy, node, ...args);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Map", methodName));
    }
}
