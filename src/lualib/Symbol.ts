declare function setmetatable<T extends object>(obj: T, metatable: any): T;

// tslint:disable-next-line: variable-name
const ____symbolMetatable = {
    __tostring(): string {
        if (this.description === undefined) {
            return 'Symbol()';
        } else {
            return 'Symbol(' + this.description + ')';
        }
    },
};

function __TS__Symbol(description?: string | number): symbol {
    return setmetatable({ description }, ____symbolMetatable) as any;
}

Symbol = {
    iterator: __TS__Symbol('Symbol.iterator'),
} as any;
