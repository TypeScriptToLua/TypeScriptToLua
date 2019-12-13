import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { LuaLibFeature } from "../../LuaLib";
import { getOrUpdate } from "../../utils";
import { TransformationContext } from "../context";

export { LuaLibFeature };

const luaLibFeatures = new WeakMap<TransformationContext, Set<LuaLibFeature>>();
export function getUsedLuaLibFeatures(context: TransformationContext): Set<LuaLibFeature> {
    return getOrUpdate(luaLibFeatures, context, () => new Set());
}

export function importLuaLibFeature(context: TransformationContext, feature: LuaLibFeature): void {
    getUsedLuaLibFeatures(context).add(feature);
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
