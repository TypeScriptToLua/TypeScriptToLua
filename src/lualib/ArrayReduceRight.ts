/** @vararg */
interface Vararg<T> extends Array<T> {}
/** @forRange */
declare function forRange(start: number, limit: number, step?: number): number[];

// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.reduceright
function __TS__ArrayReduceRight<T>(
    this: void,
    arr: T[],
    callbackFn: (accumulator: T, currentValue: T, index: number, array: T[]) => T,
    ...initial: Vararg<T>
): T {
    const len = arr.length;

    const initialValuePresent = select("#", ...initial) !== 0;
    if (len === 0 && !initialValuePresent) {
        // tslint:disable-next-line: no-string-throw
        throw "Reduce of empty array with no initial value";
    }

    let k = len - 1;
    let accumulator = undefined;

    if (initialValuePresent) {
        accumulator = select(1, ...initial);
    } else {
        accumulator = arr[0];
        k = k - 1;
    }

    for (const i of forRange(k, 0, -1)) {
        accumulator = callbackFn(accumulator, arr[i], i, arr);
    }

    return accumulator;
}
