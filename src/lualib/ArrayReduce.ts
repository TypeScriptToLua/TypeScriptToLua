// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.reduce
function __TS__ArrayReduce<T>(
    this: void,
    arr: T[],
    callbackFn: (accumulator: T, currentValue: T, index: number, array: T[]) => T,
    initial?: T
): T {
    const len = arr.length;

    if (len === 0 && initial === undefined) {
        // tslint:disable-next-line: no-string-throw
        throw "Cannot reduce empty list without initial value.";
    }

    let k = 0;
    let accumulator = initial;
    if (initial === undefined) {
        accumulator = arr[0];
        k++;
    }

    while (k < len) {
        accumulator = callbackFn(accumulator, arr[k], k, arr);
        k = k + 1;
    }

    return accumulator;
}
