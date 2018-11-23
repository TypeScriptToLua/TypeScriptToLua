declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

type ApplyFn = (...argArray: any[]) => any;

function __TS__FunctionApply(fn: ApplyFn, thisArg: any, argsArray?: any[]): any {
    if (argsArray) {
        return fn(thisArg, (unpack || table.unpack)(argsArray));
    } else {
        return fn(thisArg);
    }
}
