import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { UnsupportedProperty } from "../utils/errors";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformArrayPrototypeCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.CallExpression {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);
    const caller = context.transformExpression(expression.expression);

    const expressionName = expression.name.text;
    switch (expressionName) {
        case "concat":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayConcat, node, caller, ...params);
        case "push":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayPush, node, caller, ...params);
        case "reverse":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayReverse, node, caller);
        case "shift":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayShift, node, caller);
        case "unshift":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayUnshift, node, caller, ...params);
        case "sort":
            return transformLuaLibFunction(context, LuaLibFeature.ArraySort, node, caller, ...params);
        case "pop":
            return lua.createCallExpression(
                lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("remove")),
                [caller],
                node
            );
        case "forEach":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayForEach, node, caller, ...params);
        case "find":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFind, node, caller, ...params);
        case "findIndex":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFindIndex, node, caller, ...params);
        case "indexOf":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayIndexOf, node, caller, ...params);
        case "map":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayMap, node, caller, ...params);
        case "filter":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFilter, node, caller, ...params);
        case "reduce":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayReduce, node, caller, ...params);
        case "reduceRight":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayReduceRight, node, caller, ...params);
        case "some":
            return transformLuaLibFunction(context, LuaLibFeature.ArraySome, node, caller, ...params);
        case "every":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayEvery, node, caller, ...params);
        case "slice":
            return transformLuaLibFunction(context, LuaLibFeature.ArraySlice, node, caller, ...params);
        case "splice":
            return transformLuaLibFunction(context, LuaLibFeature.ArraySplice, node, caller, ...params);
        case "join":
            const defaultSeparatorLiteral = lua.createStringLiteral(",");
            const parameters = [
                caller,
                node.arguments.length === 0
                    ? defaultSeparatorLiteral
                    : lua.createBinaryExpression(params[0], defaultSeparatorLiteral, lua.SyntaxKind.OrOperator),
            ];

            return lua.createCallExpression(
                lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("concat")),
                parameters,
                node
            );
        case "flat":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFlat, node, caller, ...params);
        case "flatMap":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFlatMap, node, caller, ...params);
        default:
            throw UnsupportedProperty("array", expressionName, node);
    }
}

export function transformArrayProperty(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.UnaryExpression | undefined {
    switch (node.name.text) {
        case "length":
            let expression = context.transformExpression(node.expression);
            if (lua.isTableExpression(expression)) {
                expression = lua.createParenthesizedExpression(expression);
            }
            return lua.createUnaryExpression(expression, lua.SyntaxKind.LengthOperator, node);
        default:
            return undefined;
    }
}
