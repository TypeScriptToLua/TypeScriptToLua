/** !NoContext */
declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    /** !NoContext */
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

/** !NoContext */
type CallFn = (...argArray: any[]) => any;

/** !NoContext */
function __TS__FunctionCall(fn: CallFn, thisArg: any, ...args: any[]): any {
    return fn(thisArg, (unpack || table.unpack)(args));
}
