declare function unpack<T>(this: void, list: T[], i?: number, j?: number): T[];

declare namespace table {
    export function unpack<T>(this: void, list: T[], i?: number, j?: number): T[];
}

type CallFn = (this: void, ...argArray: any[]) => any;

function __TS__FunctionCall(this: void, fn: CallFn, thisArg: any, ...args: any[]): any {
    return fn(thisArg, (unpack || table.unpack)(args));
}
