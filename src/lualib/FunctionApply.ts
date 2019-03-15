declare function unpack<T>(this: void, list: T[], i?: number, j?: number): T[];

declare namespace table {
    export function unpack<T>(this: void, list: T[], i?: number, j?: number): T[];
}

type ApplyFn = (this: void, ...argArray: any[]) => any;

function __TS__FunctionApply(this: void, fn: ApplyFn, thisArg: any, argsArray?: any[]): any {
    if (argsArray) {
        return fn(thisArg, (unpack || table.unpack)(argsArray));
    } else {
        return fn(thisArg);
    }
}
