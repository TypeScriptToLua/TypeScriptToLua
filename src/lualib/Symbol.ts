// tslint:disable-next-line: variable-name
const ____symbolMetatable = {
    __tostring(): string {
        if (this.description === undefined) {
            return "Symbol()";
        } else {
            return "Symbol(" + this.description + ")";
        }
    },
};

function __TS__Symbol(this: void, description?: string | number): symbol {
    return setmetatable({ description }, ____symbolMetatable) as any;
}

Symbol = {
    iterator: __TS__Symbol("Symbol.iterator"),
    hasInstance: __TS__Symbol("Symbol.hasInstance"),

    // Not implemented
    species: __TS__Symbol("Symbol.species"),
    toStringTag: __TS__Symbol("Symbol.toStringTag"),
} as any;
