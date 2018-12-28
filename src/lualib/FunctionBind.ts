declare function unpack<T>(list: T[], i?: number, j?: number): T[];

declare namespace table {
    export function insert<T>(t: T[], pos: number, value: T): void;

    export function unpack<T>(list: T[], i?: number, j?: number): T[];
}

type BindFn = (...argArray: any[]) => any;

function __TS__FunctionBind(fn: BindFn, thisArg: any, ...boundArgs: any[]): (...args: any[]) => any {
    return (...argArray: any[]) => {
        for (let i = 0; i < boundArgs.length; ++i) {
            table.insert(argArray, i + 1, boundArgs[i]);
        }
        return fn(thisArg, (unpack || table.unpack)(argArray));
    };
}
