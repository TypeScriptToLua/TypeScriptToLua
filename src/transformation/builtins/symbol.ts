import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression, transformArguments } from "../transformers/call";
import { UnsupportedProperty } from "../utils/errors";
import { importLuaLibFeature, LuaLibFeature } from "../utils/lualib";

// Transpile a Symbol._ property
export function transformSymbolConstructorCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): tstl.CallExpression {
    const method = expression.expression;
    const signature = context.checker.getResolvedSignature(expression);
    const parameters = transformArguments(context, expression.arguments, signature);
    const methodName = method.name.text;
    switch (methodName) {
        case "for":
        case "keyFor":
            importLuaLibFeature(context, LuaLibFeature.SymbolRegistry);
            const upperMethodName = methodName[0].toUpperCase() + methodName.slice(1);
            const functionIdentifier = tstl.createIdentifier(`__TS__SymbolRegistry${upperMethodName}`);
            return tstl.createCallExpression(functionIdentifier, parameters, expression);
        default:
            throw UnsupportedProperty("Symbol", methodName, expression);
    }
}
