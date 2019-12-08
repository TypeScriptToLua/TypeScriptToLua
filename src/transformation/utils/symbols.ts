import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { getOrUpdate } from "../../utils";
import { TransformationContext } from "../context";
import { ReferencedBeforeDeclaration } from "./errors";
import { markSymbolAsReferencedInCurrentScopes } from "./scope";
import { getFirstDeclarationInFile } from "./typescript";

const symbolIdCounters = new WeakMap<TransformationContext, number>();
function nextSymbolId(context: TransformationContext): lua.SymbolId {
    const symbolId = (symbolIdCounters.get(context) ?? 0) + 1;
    symbolIdCounters.set(context, symbolId);
    return symbolId as lua.SymbolId;
}

export interface SymbolInfo {
    symbol: ts.Symbol;
    firstSeenAtPos: number;
}

const symbolInfoMap = new WeakMap<TransformationContext, Map<lua.SymbolId, SymbolInfo>>();
const symbolIdMaps = new WeakMap<TransformationContext, Map<ts.Symbol, lua.SymbolId>>();

export function getSymbolInfo(context: TransformationContext, symbolId: lua.SymbolId): SymbolInfo | undefined {
    return getOrUpdate(symbolInfoMap, context, () => new Map()).get(symbolId);
}

export function getSymbolIdOfSymbol(context: TransformationContext, symbol: ts.Symbol): lua.SymbolId | undefined {
    return getOrUpdate(symbolIdMaps, context, () => new Map()).get(symbol);
}

export function trackSymbolReference(
    context: TransformationContext,
    symbol: ts.Symbol,
    identifier: ts.Identifier
): lua.SymbolId | undefined {
    const symbolIds = getOrUpdate(symbolIdMaps, context, () => new Map());

    // Track first time symbols are seen
    let symbolId = symbolIds.get(symbol);
    if (symbolId === undefined) {
        symbolId = nextSymbolId(context);

        symbolIds.set(symbol, symbolId);
        const symbolInfo = getOrUpdate(symbolInfoMap, context, () => new Map());
        symbolInfo.set(symbolId, { symbol, firstSeenAtPos: identifier.pos });
    }

    if (context.options.noHoisting) {
        // Check for reference-before-declaration
        const declaration = getFirstDeclarationInFile(symbol, context.sourceFile);
        if (declaration && identifier.pos < declaration.pos) {
            throw ReferencedBeforeDeclaration(identifier);
        }
    }

    markSymbolAsReferencedInCurrentScopes(context, symbolId, identifier);

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
