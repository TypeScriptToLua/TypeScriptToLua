import * as ts from "typescript";
import * as tstl from "../../LuaAST";
import { setIfMissing } from "../../utils";
import { TransformationContext } from "../context";
import { ReferencedBeforeDeclaration } from "./errors";
import { markSymbolAsReferencedInCurrentScopes } from "./scope";
import { getFirstDeclarationInFile } from "./typescript";

const symbolIdCounters = new WeakMap<TransformationContext, number>();
function nextSymbolId(context: TransformationContext): tstl.SymbolId {
    const symbolId = (symbolIdCounters.get(context) || 0) + 1;
    symbolIdCounters.set(context, symbolId);
    return symbolId as tstl.SymbolId;
}

export interface SymbolInfo {
    symbol: ts.Symbol;
    firstSeenAtPos: number;
}

const symbolInfoMap = new WeakMap<TransformationContext, Map<tstl.SymbolId, SymbolInfo>>();
const symbolIdMaps = new WeakMap<TransformationContext, Map<ts.Symbol, tstl.SymbolId>>();

export function getSymbolInfo(context: TransformationContext, symbolId: tstl.SymbolId): SymbolInfo | undefined {
    return setIfMissing(symbolInfoMap, context, () => new Map()).get(symbolId);
}

export function getSymbolIdOfSymbol(context: TransformationContext, symbol: ts.Symbol): tstl.SymbolId | undefined {
    return setIfMissing(symbolIdMaps, context, () => new Map()).get(symbol);
}

export function trackSymbolReference(
    context: TransformationContext,
    symbol: ts.Symbol,
    identifier: ts.Identifier
): tstl.SymbolId | undefined {
    const symbolIds = setIfMissing(symbolIdMaps, context, () => new Map());

    // Track first time symbols are seen
    let symbolId = symbolIds.get(symbol);
    if (symbolId === undefined) {
        symbolId = nextSymbolId(context);

        symbolIds.set(symbol, symbolId);
        const symbolInfo = setIfMissing(symbolInfoMap, context, () => new Map());
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
): tstl.SymbolId | undefined {
    const symbol = context.checker.getSymbolAtLocation(identifier);
    if (symbol) {
        return trackSymbolReference(context, symbol, identifier);
    }
}
