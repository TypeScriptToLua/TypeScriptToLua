// https://www.ecma-international.org/ecma-262/10.0/index.html#sec-array.prototype.find
function __TS__ArrayFind<T>(this: void, arr: T[], callbackFn: (element: T, index?: number, array?: T[]) => boolean): T {
    const len = arr.length;
    let k = 0;
    while (k < len) {
        const elem = arr[k];
        if (callbackFn(elem, k, arr)) {
            return elem;
        }
        k = k + 1;
    }

    return undefined;
}
