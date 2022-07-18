import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { LuaLibFeature } from "../../LuaLib";
import { TransformationContext } from "../context";

export { LuaLibFeature };

export function importLuaLibFeature(context: TransformationContext, feature: LuaLibFeature): void {
    context.usedLuaLibFeatures.add(feature);
}

export function transformLuaLibFunction(
    context: TransformationContext,
    feature: LuaLibFeature,
    tsParent?: ts.Node,
    ...params: lua.Expression[]
): lua.CallExpression {
    importLuaLibFeature(context, feature);
    const functionIdentifier = lua.createIdentifier(`__TS__${feature}`);
    return lua.createCallExpression(functionIdentifier, params, tsParent);
}
