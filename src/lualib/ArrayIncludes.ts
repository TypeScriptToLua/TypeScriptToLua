// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.includes
export function __TS__ArrayIncludes<T>(this: T[], searchElement: T, fromIndex = 0): boolean {
    const len = this.length;
    let k = fromIndex;

    if (fromIndex < 0) {
        k = len + fromIndex;
    }

    if (k < 0) {
        k = 0;
    }

    // SameValueZero: NaN is the only value that is not equal to itself
    const searchingForNaN = searchElement !== searchElement;

    for (const i of $range(k + 1, len)) {
        const element = this[i - 1];
        if (element === searchElement || (searchingForNaN && element !== element)) {
            return true;
        }
    }

    return false;
}
