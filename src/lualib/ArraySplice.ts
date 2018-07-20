// https://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf
function __TS__ArraySplice<T>(list: T[], start: number, deleteCount: number, ...items: T[]) {
    // 1. 2.
    const len = list.length;

    let actualStart;

    // 4.
    if (start <  0) {
        actualStart = Math.max(len + start, 0);
    } else {
        actualStart = Math.min(start, len);
    }

    // 13.
    // 14.
    const itemCount = items.length;

    // 5. - 7.
    let actualDeleteCount: number;

    if (!start) {
        actualDeleteCount = 0;
    } else if (!deleteCount) {
        actualDeleteCount = len - actualStart;
    } else {
        actualDeleteCount = Math.min(Math.max(deleteCount, 0), len - actualStart);
    }

    // 8. ignored

    // 9.
    const out: T[] = [];

    // 10.
    // 11.
    for (let k = 0; k < actualDeleteCount; k++) {
        const from = actualStart + k;

        if (list[from]) {
            out[k] = list[from];
        }
    }

    // 15.
    if (itemCount < actualDeleteCount) {
        // a. b.
        for (let k = actualStart; k < len - actualDeleteCount; k++) {
            const from = k + actualDeleteCount;
            const to = k + itemCount;

            if (list[from]) {
                list[to] = list[from];
            } else {
                list[to] = undefined;
            }
        }
        // c. d.
        for (let k = len; k > len - actualDeleteCount + itemCount; k--) {
            list[k - 1] = undefined;
        }
    // 16.
    } else if (itemCount > actualDeleteCount) {

        for (let k = len - actualDeleteCount; k > actualStart; k--) {
            const from = k + actualDeleteCount - 1;
            const to = k + itemCount - 1;

            if (list[from]) {
                list[to] = list[from];
            } else {
                list[to] = undefined;
            }

        }
    }

    // 17.
    // 18.
    let j = actualStart;
    for (const e of items) {
        list[j] = e;
        j++;
    }

    // 19.
    for (let k = list.length - 1; k > len - actualDeleteCount + itemCount; k--) {
        list[k] = undefined;
    }

    // 20.
    return out;
}
