import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { transformArguments, transformCallAndArguments } from "../visitors/call";
import { expressionResultIsUsed, typeAlwaysHasSomeOfFlags } from "../utils/typescript";
import { moveToPrecedingTemp } from "../visitors/expression-list";
import { isUnpackCall, wrapInTable } from "../utils/lua-ast";

export function transformArrayConstructorCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "from":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFrom, node, ...params);
        case "isArray":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayIsArray, node, ...params);
        case "of":
            return wrapInTable(...params);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "Array", expressionName));
    }
}

function createTableLengthExpression(context: TransformationContext, expression: lua.Expression, node?: ts.Expression) {
    if (context.luaTarget === LuaTarget.Lua50) {
        const tableGetn = lua.createTableIndexExpression(
            lua.createIdentifier("table"),
            lua.createStringLiteral("getn")
        );
        return lua.createCallExpression(tableGetn, [expression], node);
    } else {
        return lua.createUnaryExpression(expression, lua.SyntaxKind.LengthOperator, node);
    }
}

/**
 * Optimized single element Array.push
 *
 * array[#array+1] = el
 * return (#array + 1)
 */
function transformSingleElementArrayPush(
    context: TransformationContext,
    node: ts.CallExpression,
    caller: lua.Expression,
    param: lua.Expression
): lua.Expression {
    const arrayIdentifier = lua.isIdentifier(caller) ? caller : moveToPrecedingTemp(context, caller);

    // #array + 1
    let lengthExpression: lua.Expression = lua.createBinaryExpression(
        createTableLengthExpression(context, arrayIdentifier),
        lua.createNumericLiteral(1),
        lua.SyntaxKind.AdditionOperator
    );

    const expressionIsUsed = expressionResultIsUsed(node);
    if (expressionIsUsed) {
        // store length in a temp
        lengthExpression = moveToPrecedingTemp(context, lengthExpression);
    }

    const pushStatement = lua.createAssignmentStatement(
        lua.createTableIndexExpression(arrayIdentifier, lengthExpression),
        param,
        node
    );
    context.addPrecedingStatements(pushStatement);
    return expressionIsUsed ? lengthExpression : lua.createNilLiteral();
}

export function transformArrayPrototypeCall(
    context: TransformationContext,
    node: ts.CallExpression,
    calledMethod: ts.PropertyAccessExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const [caller, params] = transformCallAndArguments(context, calledMethod.expression, node.arguments, signature);

    const expressionName = calledMethod.name.text;
    switch (expressionName) {
        case "at":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayAt, node, caller, ...params);
        case "concat":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayConcat, node, caller, ...params);
        case "entries":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayEntries, node, caller);
        case "fill":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFill, node, caller, ...params);
        case "push":
            if (node.arguments.length === 1) {
                const param = params[0] ?? lua.createNilLiteral();
                if (isUnpackCall(param)) {
                    return transformLuaLibFunction(
                        context,
                        LuaLibFeature.ArrayPushArray,
                        node,
                        caller,
                        (param as lua.CallExpression).params[0] ?? lua.createNilLiteral()
                    );
                }
                if (!lua.isDotsLiteral(param)) {
                    return transformSingleElementArrayPush(context, node, caller, param);
                }
            }

            return transformLuaLibFunction(context, LuaLibFeature.ArrayPush, node, caller, ...params);
        case "reverse":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayReverse, node, caller);
        case "shift":
            return lua.createCallExpression(
                lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("remove")),
                [caller, lua.createNumericLiteral(1)],
                node
            );
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
        case "includes":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayIncludes, node, caller, ...params);
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
            const callerType = context.checker.getTypeAtLocation(calledMethod.expression);
            const elementType = context.checker.getElementTypeOfArrayType(callerType);
            if (
                elementType &&
                typeAlwaysHasSomeOfFlags(context, elementType, ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike)
            ) {
                const defaultSeparatorLiteral = lua.createStringLiteral(",");
                const param = params[0] ?? lua.createNilLiteral();
                const parameters = [
                    caller,
                    node.arguments.length === 0
                        ? defaultSeparatorLiteral
                        : lua.isStringLiteral(param)
                        ? param
                        : lua.createBinaryExpression(param, defaultSeparatorLiteral, lua.SyntaxKind.OrOperator),
                ];

                return lua.createCallExpression(
                    lua.createTableIndexExpression(lua.createIdentifier("table"), lua.createStringLiteral("concat")),
                    parameters,
                    node
                );
            }

            return transformLuaLibFunction(context, LuaLibFeature.ArrayJoin, node, caller, ...params);
        case "flat":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFlat, node, caller, ...params);
        case "flatMap":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayFlatMap, node, caller, ...params);
        case "toReversed":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayToReversed, node, caller, ...params);
        case "toSorted":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayToSorted, node, caller, ...params);
        case "toSpliced":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayToSpliced, node, caller, ...params);
        case "with":
            return transformLuaLibFunction(context, LuaLibFeature.ArrayWith, node, caller, ...params);
        default:
            context.diagnostics.push(unsupportedProperty(calledMethod.name, "array", expressionName));
    }
}

export function transformArrayProperty(
    context: TransformationContext,
    node: ts.PropertyAccessExpression
): lua.Expression | undefined {
    switch (node.name.text) {
        case "length":
            const expression = context.transformExpression(node.expression);
            return createTableLengthExpression(context, expression, node);
        default:
            return undefined;
    }
}
