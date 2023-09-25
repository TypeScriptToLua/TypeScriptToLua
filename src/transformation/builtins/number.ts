import ts = require("typescript");
import * as lua from "../../LuaAST";
import { createNaN } from "../utils/lua-ast";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformArguments } from "../visitors/call";
import { LuaTarget } from "../../CompilerOptions";

export function transformNumberPrototypeCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(calledMethod.expression);

    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "toString":
            return params.length === 0
                ? lua.createCallExpression(lua.createIdentifier("tostring"), [caller], node)
                : transformLuaLibFunction(context, LuaLibFeature.NumberToString, node, caller, ...params);
        case "toFixed":
            return transformLuaLibFunction(context, LuaLibFeature.NumberToFixed, node, caller, ...params);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "number", expressionName));
    }
}

export function transformNumberProperty(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const name = node.name.text;
    switch (name) {
        case "POSITIVE_INFINITY":
            if (context.luaTarget === LuaTarget.Lua50) {
                const one = lua.createNumericLiteral(1);
                const zero = lua.createNumericLiteral(0);
                return lua.createBinaryExpression(one, zero, lua.SyntaxKind.DivisionOperator);
            } else {
                const math = lua.createIdentifier("math");
                const huge = lua.createStringLiteral("huge");
                return lua.createTableIndexExpression(math, huge, node);
            }
        case "NaN":
            return createNaN(node);
        case "EPSILON":
            return lua.createBinaryExpression(
                lua.createNumericLiteral(2),
                lua.createNumericLiteral(-52),
                lua.SyntaxKind.PowerOperator,
                node
            );
        case "MIN_VALUE":
            return lua.createBinaryExpression(
                lua.createNumericLiteral(2),
                lua.createNumericLiteral(-1074),
                lua.SyntaxKind.PowerOperator,
                node
            );
        case "NEGATIVE_INFINITY":
            if (context.luaTarget === LuaTarget.Lua50) {
                const one = lua.createNumericLiteral(1);
                const zero = lua.createNumericLiteral(0);
                return lua.createBinaryExpression(
                    lua.createNumericLiteral(0),
                    lua.createBinaryExpression(one, zero, lua.SyntaxKind.DivisionOperator),
                    lua.SyntaxKind.SubtractionOperator
                );
            } else {
                const math = lua.createIdentifier("math");
                const huge = lua.createStringLiteral("huge");
                return lua.createBinaryExpression(
                    lua.createNumericLiteral(0),
                    lua.createTableIndexExpression(math, huge, node),
                    lua.SyntaxKind.SubtractionOperator
                );
            }

        default:
            context.diagnostics.push(unsupportedProperty(node.name, "Number", name));
    }
}

export function transformNumberConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.CallExpression | undefined {
    const parameters = transformArguments(context, node.arguments);
    const methodName = calledMethod.name.text;
    switch (methodName) {
        case "isNaN":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsNaN, node, ...parameters);
        case "isFinite":
            return transformLuaLibFunction(context, LuaLibFeature.NumberIsFinite, node, ...parameters);
        case "parseInt":
            return transformLuaLibFunction(context, LuaLibFeature.NumberParseInt, node, ...parameters);
        case "parseFloat":
            return transformLuaLibFunction(context, LuaLibFeature.NumberParseFloat, node, ...parameters);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Number", methodName));
    }
}
