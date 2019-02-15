declare function setmetatable<T extends object>(obj: T, metatable: any): T;

const symbolMetatable = {
    __tostring(): string {
        if (this.description === undefined) {
            return 'Symbol()';
        } else {
            return 'Symbol(' + this.description + ')';
        }
    },
};

function __TS__Symbol(description?: string | number): symbol {
    return setmetatable({ description }, symbolMetatable) as any;
}

Symbol = {
    iterator: __TS__Symbol('Symbol.iterator'),
} as any;
