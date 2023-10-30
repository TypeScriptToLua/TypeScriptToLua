import ts = require("typescript");
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { transformArguments } from "../visitors/call";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { unsupportedProperty } from "../utils/diagnostics";

export function transformBooleanPrototypeCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(calledMethod.expression);

    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "valueOf":
            return transformLuaLibFunction(context, LuaLibFeature.BooleanValueOf, node, caller, ...params);

        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "boolean", expressionName));
    }
}
