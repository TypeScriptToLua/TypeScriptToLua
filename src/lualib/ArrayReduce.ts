declare function select<T>(this: void, index: number, ...args: T[]): T;
declare function select<T>(this: void, index: "#", ...args: T[]): number;
/** @vararg */
interface VarArg<T> extends Array<T> {}

// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.reduce
function __TS__ArrayReduce<T>(
    this: void,
    arr: T[],
    callbackFn: (accumulator: T, currentValue: T, index: number, array: T[]) => T,
    ...initial: VarArg<T>
): T {
    const len = arr.length;

    if (len === 0 && select("#", ...initial) === 0) {
        // tslint:disable-next-line: no-string-throw
        throw "Reduce of empty array with no initial value";
    }

    let k = 0;
    let accumulator = select(1, ...initial);
    if (accumulator === undefined) {
        accumulator = arr[0];
        k++;
    }

    while (k < len) {
        accumulator = callbackFn(accumulator, arr[k], k, arr);
        k = k + 1;
    }

    return accumulator;
}
