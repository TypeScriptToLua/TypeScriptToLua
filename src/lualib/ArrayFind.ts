// https://www.ecma-international.org/ecma-262/10.0/index.html#sec-array.prototype.find
function __TS__ArrayFind<T>(
    this: void,
    arr: T[],
    predicate: (value: T, index: number, obj: T[]) => unknown
): T | undefined {
    const len = arr.length;
    let k = 0;
    while (k < len) {
        const elem = arr[k];
        if (predicate(elem, k, arr)) {
            return elem;
        }
        k += 1;
    }

    return undefined;
}
