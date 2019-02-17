// tslint:disable-next-line: variable-name
const ____symbolRegistry: Record<string, symbol> = {};

function __TS__SymbolRegistryFor(key: string): symbol {
    if (!____symbolRegistry[key])  {
        ____symbolRegistry[key] = __TS__Symbol(key);
    }

    return ____symbolRegistry[key];
}

function __TS__SymbolRegistryKeyFor(sym: symbol): string {
    for (const key in ____symbolRegistry) {
        if (____symbolRegistry[key] === sym) return key;
    }
}
