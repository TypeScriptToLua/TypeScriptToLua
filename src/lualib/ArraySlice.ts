// https://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf 22.1.3.23
function __TS__ArraySlice<T>(list: T[], first: number, last: number): T[] {
    const len = list.length;

    let k: number;
    if (first < 0) {
        k = Math.max(len + first, 0);
    } else {
        k = Math.min(first, len);
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
