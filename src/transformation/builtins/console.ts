import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { transformArguments } from "../visitors/call";

const isStringFormatTemplate = (node: ts.Expression) => ts.isStringLiteral(node) && node.text.includes("%");

export function transformConsoleCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const methodName = calledMethod.name.text;
    const signature = context.checker.getResolvedSignature(node);
    const parameters = transformArguments(context, node.arguments, signature);

    switch (methodName) {
        case "error":
        case "info":
        case "log":
        case "warn":
            if (node.arguments.length > 0 && isStringFormatTemplate(node.arguments[0])) {
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
            if (node.arguments.length > 1 && isStringFormatTemplate(node.arguments[1])) {
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
            if (node.arguments.length > 0 && isStringFormatTemplate(node.arguments[0])) {
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
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "console", methodName));
    }
}
