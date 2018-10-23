/** !NoContext */
declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    /** !NoContext */
    export function insert<T>(t: T[], pos: number, value: T): void;

    /** !NoContext */
    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

/** !NoContext */
type BindFn = (...argArray: any[]) => any;

/** !NoContext */
function __TS__FunctionBind(fn: BindFn, thisArg: any, ...boundArgs: any[]): (...args: any[]) => any {
    return (...argArray: any[]) => {
        for (let i = 0; i < boundArgs.length; ++i) {
            table.insert(argArray, i + 1, boundArgs[i]);
        }
        return fn(thisArg, (unpack || table.unpack)(argArray));
    };
}
