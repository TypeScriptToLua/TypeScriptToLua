function __TS__ArrayIndexOf<T>(this: void, arr: T[], searchElement: T, fromIndex?: number): number {
    const len = arr.length;
    if (len === 0) {
        return -1;
    }

    let n = 0;
    if (fromIndex) {
        n = fromIndex;
    }

    if (n >= len) {
        return -1;
    }

    let k: number;
    if (n >= 0) {
        k = n;
    } else {
        k = len + n;
        if (k < 0) {
            k = 0;
        }
    }

    for (let i = k; i < len; i++) {
        if (arr[i] === searchElement) {
            return i;
        }
    }

    return -1;
}
