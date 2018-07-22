function __TS__ArraySplice<T>(list: T[], start: number, deleteCount: number, ...items: T[]): T[] {

    const len = list.length;

    let actualStart;

    if (start <  0) {
        actualStart = Math.max(len + start, 0);
    } else {
        actualStart = Math.min(start, len);
    }

    const itemCount = items.length;

    let actualDeleteCount: number;

    if (!start) {
        actualDeleteCount = 0;
    } else if (!deleteCount) {
        actualDeleteCount = len - actualStart;
    } else {
        actualDeleteCount = Math.min(Math.max(deleteCount, 0), len - actualStart);
    }

    const out: T[] = [];

    for (let k = 0; k < actualDeleteCount; k++) {
        const from = actualStart + k;

        if (list[from]) {
            out[k] = list[from];
        }
    }

    if (itemCount < actualDeleteCount) {
        for (let k = actualStart; k < len - actualDeleteCount; k++) {
            const from = k + actualDeleteCount;
            const to = k + itemCount;

            if (list[from]) {
                list[to] = list[from];
            } else {
                list[to] = undefined;
            }
        }
        for (let k = len; k > len - actualDeleteCount + itemCount; k--) {
            list[k - 1] = undefined;
        }
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

    let j = actualStart;
    for (const e of items) {
        list[j] = e;
        j++;
    }

    for (let k = list.length - 1; k >= len - actualDeleteCount + itemCount; k--) {
        list[k] = undefined;
    }

    return out;
}
