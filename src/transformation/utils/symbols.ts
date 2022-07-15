import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { isOptimizedVarArgSpread } from "../visitors/spread";
import { markSymbolAsReferencedInCurrentScopes } from "./scope";

export interface SymbolInfo {
    symbol: ts.Symbol;
    firstSeenAtPos: number;
}

export function getSymbolInfo(context: TransformationContext, symbolId: lua.SymbolId): SymbolInfo | undefined {
    // return getOrUpdate(symbolInfoMap, context, () => new Map()).get(symbolId);
    return context.symbolInfoMap.get(symbolId);
}

export function getSymbolIdOfSymbol(context: TransformationContext, symbol: ts.Symbol): lua.SymbolId | undefined {
    // return getOrUpdate(symbolIdMaps, context, () => new Map()).get(symbol);
    return context.symbolIdMaps.get(symbol);
}

export function trackSymbolReference(
    context: TransformationContext,
    symbol: ts.Symbol,
    identifier: ts.Identifier
): lua.SymbolId | undefined {
    // const symbolIds = getOrUpdate(symbolIdMaps, context, () => new Map());
    // Track first time symbols are seen
    let symbolId = context.symbolIdMaps.get(symbol);
    if (symbolId === undefined) {
        symbolId = context.nextSymbolId();

        context.symbolIdMaps.set(symbol, symbolId);
        // const symbolInfo = getOrUpdate(symbolInfoMap, context, () => new Map());
        context.symbolInfoMap.set(symbolId, { symbol, firstSeenAtPos: identifier.pos });
    }

    // If isOptimizedVarArgSpread returns true, the identifier will not appear in the resulting Lua.
    // Only the optimized ellipses (...) will be used.
    if (!isOptimizedVarArgSpread(context, symbol, identifier)) {
        markSymbolAsReferencedInCurrentScopes(context, symbolId, identifier);
    }

    return symbolId;
}

export function getIdentifierSymbolId(
    context: TransformationContext,
    identifier: ts.Identifier
): lua.SymbolId | undefined {
    const symbol = context.checker.getSymbolAtLocation(identifier);
    if (symbol) {
        return trackSymbolReference(context, symbol, identifier);
    }
}
