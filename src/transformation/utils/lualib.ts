import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { LuaLibFeature } from "../../LuaLib";
import { getOrUpdate } from "../../utils";
import { TransformationContext } from "../context";

const luaLibFeatures = new WeakMap<TransformationContext, Set<LuaLibFeature>>();

export { LuaLibFeature };

export function getUsedLuaLibFeatures(context: TransformationContext): Set<LuaLibFeature> {
    return getOrUpdate(luaLibFeatures, context, () => new Set());
}

export function importLuaLibFeature(context: TransformationContext, feature: LuaLibFeature): void {
    getUsedLuaLibFeatures(context).add(feature);
}

export function transformLuaLibFunction(
    context: TransformationContext,
    feature: LuaLibFeature,
    tsParent?: ts.Expression,
    ...params: tstl.Expression[]
): tstl.CallExpression {
    importLuaLibFeature(context, feature);
    const functionIdentifier = tstl.createIdentifier(`__TS__${feature}`);
    return tstl.createCallExpression(functionIdentifier, params, tsParent);
}
