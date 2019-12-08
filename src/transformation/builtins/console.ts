import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

const isStringFormatTemplate = (node: ts.Expression) => ts.isStringLiteral(node) && node.text.includes("%");

export function transformConsoleCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): lua.Expression {
    const method = expression.expression;
    const methodName = method.name.text;
    const signature = context.checker.getResolvedSignature(expression);
    const parameters = transformArguments(context, expression.arguments, signature);

    switch (methodName) {
        case "error":
        case "info":
        case "log":
        case "warn":
            if (expression.arguments.length > 0 && isStringFormatTemplate(expression.arguments[0])) {
                // print(string.format([arguments]))
                const stringFormatCall = lua.createCallExpression(
                    lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("format")),
                    parameters
                );
                return lua.createCallExpression(lua.createIdentifier("print"), [stringFormatCall]);
            }
            // print([arguments])
            return lua.createCallExpression(lua.createIdentifier("print"), parameters);
        case "assert":
            if (expression.arguments.length > 1 && isStringFormatTemplate(expression.arguments[1])) {
                // assert([condition], string.format([arguments]))
                const stringFormatCall = lua.createCallExpression(
                    lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("format")),
                    parameters.slice(1)
                );
                return lua.createCallExpression(lua.createIdentifier("assert"), [parameters[0], stringFormatCall]);
            }
            // assert()
            return lua.createCallExpression(lua.createIdentifier("assert"), parameters);
        case "trace":
            if (expression.arguments.length > 0 && isStringFormatTemplate(expression.arguments[0])) {
                // print(debug.traceback(string.format([arguments])))
                const stringFormatCall = lua.createCallExpression(
                    lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("format")),
                    parameters
                );
                const debugTracebackCall = lua.createCallExpression(
                    lua.createTableIndexExpression(lua.createIdentifier("debug"), lua.createStringLiteral("traceback")),
                    [stringFormatCall]
                );
                return lua.createCallExpression(lua.createIdentifier("print"), [debugTracebackCall]);
            }
            // print(debug.traceback([arguments])))
            const debugTracebackCall = lua.createCallExpression(
                lua.createTableIndexExpression(lua.createIdentifier("debug"), lua.createStringLiteral("traceback")),
                parameters
            );
            return lua.createCallExpression(lua.createIdentifier("print"), [debugTracebackCall]);
        default:
            throw UnsupportedProperty("console", methodName, expression);
    }
}
