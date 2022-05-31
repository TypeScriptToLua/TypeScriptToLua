import ts = require("typescript");
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { transformArguments } from "../visitors/call";

export function transformSymbolConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.CallExpression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const parameters = transformArguments(context, node.arguments, signature);
    const methodName = calledMethod.name.text;
    switch (methodName) {
        case "for":
        case "keyFor":
            importLuaLibFeature(context, LuaLibFeature.SymbolRegistry);
            const upperMethodName = methodName[0].toUpperCase() + methodName.slice(1);
            const functionIdentifier = lua.createIdentifier(`__TS__SymbolRegistry${upperMethodName}`);
            return lua.createCallExpression(functionIdentifier, parameters, node);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Symbol", methodName));
    }
}
