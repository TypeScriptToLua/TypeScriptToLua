import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { createExpressionPlusOne } from "../utils/lua-ast";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

function createStringCall(methodName: string, tsOriginal: ts.Node, ...params: lua.Expression[]): lua.CallExpression {
    const stringIdentifier = lua.createIdentifier("string");
    return lua.createCallExpression(
        lua.createTableIndexExpression(stringIdentifier, lua.createStringLiteral(methodName)),
        params,
        tsOriginal
    );
}

export function transformStringPrototypeCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression {
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
                params[1] ? createExpressionPlusOne(params[1]) : lua.createNilLiteral(),
                lua.createBooleanLiteral(true)
            );

            return lua.createBinaryExpression(
                lua.createBinaryExpression(stringExpression, lua.createNumericLiteral(0), lua.SyntaxKind.OrOperator),
                lua.createNumericLiteral(1),
                lua.SyntaxKind.SubtractionOperator,
                node
            );
        case "substr":
            if (node.arguments.length === 1) {
                const argument = context.transformExpression(node.arguments[0]);
                const arg1 = createExpressionPlusOne(argument);
                return createStringCall("sub", node, caller, arg1);
            } else {
                const sumArg = lua.createBinaryExpression(params[0], params[1], lua.SyntaxKind.AdditionOperator);
                return createStringCall("sub", node, caller, createExpressionPlusOne(params[0]), sumArg);
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
        case "trim":
            return transformLuaLibFunction(context, LuaLibFeature.StringTrim, node, caller);
        case "trimEnd":
        case "trimRight":
            return transformLuaLibFunction(context, LuaLibFeature.StringTrimEnd, node, caller);
        case "trimStart":
        case "trimLeft":
            return transformLuaLibFunction(context, LuaLibFeature.StringTrimStart, node, caller);
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
            const math = lua.createIdentifier("math");
            const floor = lua.createStringLiteral("floor");
            const parameter = lua.createCallExpression(lua.createTableIndexExpression(math, floor), [params[0]]);
            return createStringCall("rep", node, caller, parameter);
        case "padStart":
            return transformLuaLibFunction(context, LuaLibFeature.StringPadStart, node, caller, ...params);
        case "padEnd":
            return transformLuaLibFunction(context, LuaLibFeature.StringPadEnd, node, caller, ...params);
        default:
            throw UnsupportedProperty("string", expressionName, node);
    }
}

export function transformStringConstructorCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    switch (expressionName) {
        case "fromCharCode":
            return lua.createCallExpression(
                lua.createTableIndexExpression(lua.createIdentifier("string"), lua.createStringLiteral("char")),
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
): lua.UnaryExpression {
    switch (node.name.text) {
        case "length":
            const expression = context.transformExpression(node.expression);
            return lua.createUnaryExpression(expression, lua.SyntaxKind.LengthOperator, node);
        default:
            throw UnsupportedProperty("string", node.name.text, node);
    }
}
