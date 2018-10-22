/** !NoContext */
declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    /** !NoContext */
    export function insert<T>(t: T[], pos: number, value: T): void;

    /** !NoContext */
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

/** !NoContext */
// tslint:disable-next-line:callable-types <- decorators don't work on type aliases right now
declare interface Fn { (...argArray: any[]): any; }

function __TS__FunctionBind(fn: Fn, thisArg: any, ...boundArgs: any[]): Fn {
    return (...argArray: any[]) => {
        for (let i = 0; i < boundArgs.length; ++i) {
            table.insert(argArray, i + 1, boundArgs[i]);
        }
        return fn(thisArg, (unpack || table.unpack)(argArray));
    };
}
