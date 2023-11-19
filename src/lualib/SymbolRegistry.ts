import { __TS__Symbol } from "./Symbol";

const symbolRegistry: Record<string, symbol> = {};
export function __TS__SymbolRegistryFor(this: void, key: string): symbol {
    if (!symbolRegistry[key]) {
        symbolRegistry[key] = __TS__Symbol(key);
    }

    return symbolRegistry[key];
}

export function __TS__SymbolRegistryKeyFor(this: void, sym: symbol): string | undefined {
    for (const key in symbolRegistry) {
        if (symbolRegistry[key] === sym) return key;
    }

    return undefined;
}
