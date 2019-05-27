// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.slice
function __TS__ArraySlice<T>(this: void, list: T[], first: number, last: number): T[] {
    const len = list.length;

    const relativeStart = first || 0;

    let k: number;
    if (relativeStart < 0) {
        k = Math.max(len + relativeStart, 0);
    } else {
        k = Math.min(relativeStart, len);
    }

    let relativeEnd = last;
    if (last === undefined) {
        relativeEnd = len;
    }

    let final: number;
    if (relativeEnd < 0) {
        final = Math.max(len + relativeEnd, 0);
    } else {
        final = Math.min(relativeEnd, len);
    }

    const out = [];

    let n = 0;
    while (k < final) {
        out[n] = list[k];
        k++;
        n++;
    }
    return out;
}
