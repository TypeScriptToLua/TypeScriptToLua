import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { TransformationContext } from "../context";
import { PropertyCallExpression, transformArguments } from "../transformers/call";
import { transformIdentifier } from "../transformers/identifier";
import { UnsupportedProperty } from "../utils/errors";
import { createExpressionPlusOne } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";

function createStringCall(methodName: string, tsOriginal: ts.Node, ...params: tstl.Expression[]): tstl.CallExpression {
    const stringIdentifier = tstl.createIdentifier("string");
    return tstl.createCallExpression(
        tstl.createTableIndexExpression(stringIdentifier, tstl.createStringLiteral(methodName)),
        params,
        tsOriginal
    );
}

export function transformStringCall(context: TransformationContext, node: PropertyCallExpression): tstl.Expression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(expression.expression);

    const expressionName = expression.name.text;
    switch (expressionName) {
        case "replace":
            return transformLuaLibFunction(context, LuaLibFeature.StringReplace, node, caller, ...params);
        case "concat":
            return transformLuaLibFunction(context, LuaLibFeature.StringConcat, node, caller, ...params);
        case "indexOf":
            const stringExpression = createStringCall(
                "find",
                node,
                caller,
                params[0],
                params[1] ? createExpressionPlusOne(params[1]) : tstl.createNilLiteral(),
                tstl.createBooleanLiteral(true)
            );

            return tstl.createParenthesizedExpression(
                tstl.createBinaryExpression(
                    tstl.createParenthesizedExpression(
                        tstl.createBinaryExpression(
                            stringExpression,
                            tstl.createNumericLiteral(0),
                            tstl.SyntaxKind.OrOperator
                        )
                    ),
                    tstl.createNumericLiteral(1),
                    tstl.SyntaxKind.SubtractionOperator,
                    node
                )
            );
        case "substr":
            if (node.arguments.length === 1) {
                const argument = context.transformExpression(node.arguments[0]);
                const arg1 = createExpressionPlusOne(argument);
                return createStringCall("sub", node, caller, arg1);
            } else {
                const arg1 = params[0];
                const arg2 = params[1];
                const sumArg = tstl.createBinaryExpression(
                    tstl.createParenthesizedExpression(arg1),
                    tstl.createParenthesizedExpression(arg2),
                    tstl.SyntaxKind.AdditionOperator
                );
                return createStringCall("sub", node, caller, createExpressionPlusOne(arg1), sumArg);
            }
        case "substring":
            if (node.arguments.length === 1) {
                const arg1 = createExpressionPlusOne(params[0]);
                return createStringCall("sub", node, caller, arg1);
            } else {
                const arg1 = createExpressionPlusOne(params[0]);
                const arg2 = params[1];
                return createStringCall("sub", node, caller, arg1, arg2);
            }
        case "slice":
            if (node.arguments.length === 0) {
                return caller;
            } else if (node.arguments.length === 1) {
                const arg1 = createExpressionPlusOne(params[0]);
                return createStringCall("sub", node, caller, arg1);
            } else {
                const arg1 = createExpressionPlusOne(params[0]);
                const arg2 = params[1];
                return createStringCall("sub", node, caller, arg1, arg2);
            }
        case "toLowerCase":
            return createStringCall("lower", node, caller);
        case "toUpperCase":
            return createStringCall("upper", node, caller);
        case "split":
            return transformLuaLibFunction(context, LuaLibFeature.StringSplit, node, caller, ...params);
        case "charAt":
            const firstParamPlusOne = createExpressionPlusOne(params[0]);
            return createStringCall("sub", node, caller, firstParamPlusOne, firstParamPlusOne);
        case "charCodeAt": {
            const firstParamPlusOne = createExpressionPlusOne(params[0]);
            return createStringCall("byte", node, caller, firstParamPlusOne);
        }
        case "startsWith":
            return transformLuaLibFunction(context, LuaLibFeature.StringStartsWith, node, caller, ...params);
        case "endsWith":
            return transformLuaLibFunction(context, LuaLibFeature.StringEndsWith, node, caller, ...params);
        case "repeat":
            const math = tstl.createIdentifier("math");
            const floor = tstl.createStringLiteral("floor");
            const parameter = tstl.createCallExpression(tstl.createTableIndexExpression(math, floor), [params[0]]);
            return createStringCall("rep", node, caller, parameter);
        case "padStart":
            return transformLuaLibFunction(context, LuaLibFeature.StringPadStart, node, caller, ...params);
        case "padEnd":
            return transformLuaLibFunction(context, LuaLibFeature.StringPadEnd, node, caller, ...params);

        case "byte":
        case "char":
        case "dump":
        case "find":
        case "format":
        case "gmatch":
        case "gsub":
        case "len":
        case "lower":
        case "match":
        case "pack":
        case "packsize":
        case "rep":
        case "reverse":
        case "sub":
        case "unpack":
        case "upper":
            // Allow lua's string instance methods
            let stringVariable = context.transformExpression(expression.expression);
            if (ts.isStringLiteralLike(expression.expression)) {
                // "foo":method() needs to be ("foo"):method()
                stringVariable = tstl.createParenthesizedExpression(stringVariable);
            }

            return tstl.createMethodCallExpression(
                stringVariable,
                transformIdentifier(context, expression.name),
                params,
                node
            );
        default:
            throw UnsupportedProperty("string", expressionName, node);
    }
}

export function transformStringConstructorCall(
    context: TransformationContext,
    node: PropertyCallExpression
): tstl.Expression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    switch (expressionName) {
        case "fromCharCode":
            return tstl.createCallExpression(
                tstl.createTableIndexExpression(tstl.createIdentifier("string"), tstl.createStringLiteral("char")),
                params,
                node
            );

        default:
            throw UnsupportedProperty("String", expressionName, node);
    }
}

export function transformStringProperty(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): tstl.UnaryExpression {
    switch (node.name.text) {
        case "length":
            let expression = context.transformExpression(node.expression);
            if (ts.isTemplateExpression(node.expression)) {
                expression = tstl.createParenthesizedExpression(expression);
            }
            return tstl.createUnaryExpression(expression, tstl.SyntaxKind.LengthOperator, node);
        default:
            throw UnsupportedProperty("string", node.name.text, node);
    }
}
