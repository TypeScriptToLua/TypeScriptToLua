import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

// Transpile a Symbol._ property
export function transformSymbolConstructorCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): lua.CallExpression {
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
            throw UnsupportedProperty("Symbol", methodName, expression);
    }
}
