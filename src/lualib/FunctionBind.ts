declare function unpack<T>(this: void, list: T[], i?: number, j?: number): T[];

declare namespace table {
    export function insert<T>(this: void, t: T[], pos: number, value: T): void;

    export function unpack<T>(this: void, list: T[], i?: number, j?: number): T[];
}

type BindFn = (this: void, ...argArray: any[]) => any;

function __TS__FunctionBind(this: void, fn: BindFn, thisArg: any, ...boundArgs: any[]): (...args: any[]) => any {
    return (...argArray: any[]) => {
        for (let i = 0; i < boundArgs.length; ++i) {
            table.insert(argArray, i + 1, boundArgs[i]);
        }
        return fn(thisArg, (unpack || table.unpack)(argArray));
    };
}
