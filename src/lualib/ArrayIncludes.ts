// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.includes
function __TS__ArrayIncludes<T>(this: T[], searchElement: T, fromIndex = 0): boolean {
    const len = this.length;
    let k = fromIndex;

    if (fromIndex < 0) {
        k = len + fromIndex;
    }

    if (k < 0) {
        k = 0;
    }

    for (const i of forRange(k, len)) {
        if (this[i] === searchElement) {
            return true;
        }
    }

    return false;
}
