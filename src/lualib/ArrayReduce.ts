/** @vararg */
interface Vararg<T> extends Array<T> {}

// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.reduce
function __TS__ArrayReduce<T>(
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

    let k = 0;
    let accumulator = undefined;

    if (initialValuePresent) {
        accumulator = select(1, ...initial);
    } else {
        accumulator = arr[0];
        k = 1;
    }

    while (k < len) {
        accumulator = callbackFn(accumulator, arr[k], k, arr);
        k = k + 1;
    }

    return accumulator;
}
