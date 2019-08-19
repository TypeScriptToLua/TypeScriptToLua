import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression, transformArguments } from "../transformers/call";
import { UnsupportedProperty } from "../utils/errors";

const isStringFormatTemplate = (expression: ts.Expression) =>
    ts.isStringLiteral(expression) && expression.text.match(/\%/g) !== null;

export function transformConsoleCall(
    context: TransformationContext,
    expression: PropertyCallExpression
): tstl.Expression {
    const method = expression.expression;
    const methodName = method.name.text;
    const signature = context.checker.getResolvedSignature(expression);
    const parameters = transformArguments(context, expression.arguments, signature);

    switch (methodName) {
        case "log":
            if (expression.arguments.length > 0 && isStringFormatTemplate(expression.arguments[0])) {
                // print(string.format([arguments]))
                const stringFormatCall = tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("string"),
                        tstl.createStringLiteral("format")
                    ),
                    parameters
                );
                return tstl.createCallExpression(tstl.createIdentifier("print"), [stringFormatCall]);
            }
            // print([arguments])
            return tstl.createCallExpression(tstl.createIdentifier("print"), parameters);
        case "assert":
            if (expression.arguments.length > 1 && isStringFormatTemplate(expression.arguments[1])) {
                // assert([condition], string.format([arguments]))
                const stringFormatCall = tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("string"),
                        tstl.createStringLiteral("format")
                    ),
                    parameters.slice(1)
                );
                return tstl.createCallExpression(tstl.createIdentifier("assert"), [parameters[0], stringFormatCall]);
            }
            // assert()
            return tstl.createCallExpression(tstl.createIdentifier("assert"), parameters);
        case "trace":
            if (expression.arguments.length > 0 && isStringFormatTemplate(expression.arguments[0])) {
                // print(debug.traceback(string.format([arguments])))
                const stringFormatCall = tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("string"),
                        tstl.createStringLiteral("format")
                    ),
                    parameters
                );
                const debugTracebackCall = tstl.createCallExpression(
                    tstl.createTableIndexExpression(
                        tstl.createIdentifier("debug"),
                        tstl.createStringLiteral("traceback")
                    ),
                    [stringFormatCall]
                );
                return tstl.createCallExpression(tstl.createIdentifier("print"), [debugTracebackCall]);
            }
            // print(debug.traceback([arguments])))
            const debugTracebackCall = tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createIdentifier("debug"), tstl.createStringLiteral("traceback")),
                parameters
            );
            return tstl.createCallExpression(tstl.createIdentifier("print"), [debugTracebackCall]);
        default:
            throw UnsupportedProperty("console", methodName, expression);
    }
}
