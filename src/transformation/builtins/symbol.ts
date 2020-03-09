import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformSymbolConstructorCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): lua.CallExpression | undefined {
    const method = expression.expression;
    const signature = context.checker.getResolvedSignature(expression);
    const parameters = transformArguments(context, expression.arguments, signature);
    const methodName = method.name.text;
    switch (methodName) {
        case "for":
        case "keyFor":
            importLuaLibFeature(context, LuaLibFeature.SymbolRegistry);
            const upperMethodName = methodName[0].toUpperCase() + methodName.slice(1);
            const functionIdentifier = lua.createIdentifier(`__TS__SymbolRegistry${upperMethodName}`);
            return lua.createCallExpression(functionIdentifier, parameters, expression);
        default:
            context.diagnostics.push(unsupportedProperty(method.name, "Symbol", methodName));
    }
}
