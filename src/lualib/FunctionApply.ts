/** !NoContext */
declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    /** !NoContext */
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

/** !NoContext */
type ApplyFn = (...argArray: any[]) => any;

/** !NoContext */
function __TS__FunctionApply(fn: ApplyFn, thisArg: any, argsArray?: any[]): any {
    if (argsArray) {
        return fn(thisArg, (unpack || table.unpack)(argsArray));
    } else {
        return fn(thisArg);
    }
}
