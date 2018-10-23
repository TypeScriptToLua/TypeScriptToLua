/** !NoContext */
declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    /** !NoContext */
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

/** !NoContext */
// tslint:disable-next-line:callable-types <- decorators don't work on type aliases right now
declare interface Fn { (...argArray: any[]): any; }

/** !NoContext */
function __TS__FunctionApply(fn: Fn, thisArg: any, argsArray?: any[]): any {
    if (argsArray) {
        return fn(thisArg, (unpack || table.unpack)(argsArray));
    } else {
        return fn(thisArg);
    }
}
