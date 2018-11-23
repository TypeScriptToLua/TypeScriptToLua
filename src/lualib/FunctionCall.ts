declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

type CallFn = (...argArray: any[]) => any;

function __TS__FunctionCall(fn: CallFn, thisArg: any, ...args: any[]): any {
    return fn(thisArg, (unpack || table.unpack)(args));
}
