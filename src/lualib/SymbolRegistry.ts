const symbolRegistry: Record<string, symbol> = {};

function __TS__SymbolRegistryFor(key: string): symbol {
    if (!symbolRegistry[key])  {
        symbolRegistry[key] = __TS__Symbol(key);
    }

    return symbolRegistry[key];
}

function __TS__SymbolRegistryKeyFor(sym: symbol): string {
    for (const key in symbolRegistry) {
        if (symbolRegistry[key] === sym) return key;
    }
}
