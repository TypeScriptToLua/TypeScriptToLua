// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.reduce
function __TS__ArrayReduce<T>(
    this: void,
    arr: T[],
    callbackFn: (accumulator: T, currentValue: T, index: number, array: T[]) => T,
    ...initial: Vararg<T[]>
): T {
    const len = arr.length;

    let k = 0;
    let accumulator = undefined;

    // Check if initial value is present in function call
    if (select("#", ...initial) !== 0) {
        accumulator = select(1, ...initial);
    } else if (len > 0) {
        accumulator = arr[0];
        k = 1;
    } else {
        throw "Reduce of empty array with no initial value";
    }

    for (const i of forRange(k, len - 1)) {
        accumulator = callbackFn(accumulator, arr[i], i, arr);
    }

    return accumulator;
}
