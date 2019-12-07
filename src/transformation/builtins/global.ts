import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { LuaLibFeature, transformLuaLibFunction } from "../utils/lualib";
import { isNumberType } from "../utils/typescript";
import { transformArguments } from "../visitors/call";

export function transformGlobalCall(
    context: TransformationContext,
    node: ts.CallExpression
): lua.Expression | undefined {
    const signature = context.checker.getResolvedSignature(node);
    const parameters = transformArguments(context, node.arguments, signature);
    const expressionType = context.checker.getTypeAtLocation(node.expression);
    const name = expressionType.symbol.name;
    switch (name) {
        case "SymbolConstructor":
            return transformLuaLibFunction(context, LuaLibFeature.Symbol, node, ...parameters);
        case "NumberConstructor":
            return transformLuaLibFunction(context, LuaLibFeature.Number, node, ...parameters);
        case "isNaN":
        case "isFinite":
            const numberParameters = isNumberType(context, expressionType)
                ? parameters
                : [transformLuaLibFunction(context, LuaLibFeature.Number, undefined, ...parameters)];

            return transformLuaLibFunction(
                context,
                name === "isNaN" ? LuaLibFeature.NumberIsNaN : LuaLibFeature.NumberIsFinite,
                node,
                ...numberParameters
            );
    }
}
