// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.splice
function __TS__ArraySplice<T>(this: void, list: T[], ...args: Vararg<unknown[]>): T[] {
    const len = list.length;

    const actualArgumentCount = select("#", ...args);
    const start = select(1, ...args) as number;
    const deleteCount = select(2, ...args) as number;

    let actualStart: number;

    if (start < 0) {
        actualStart = Math.max(len + start, 0);
    } else {
        actualStart = Math.min(start, len);
    }

    const itemCount = Math.max(actualArgumentCount - 2, 0);

    let actualDeleteCount: number;

    if (actualArgumentCount === 0) {
        // ECMA-spec line 5: if number of actual arguments is 0
        actualDeleteCount = 0;
    } else if (actualArgumentCount === 1) {
        // ECMA-spec line 6: if number of actual arguments is 1
        actualDeleteCount = len - actualStart;
    } else {
        actualDeleteCount = Math.min(Math.max(deleteCount || 0, 0), len - actualStart);
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
    for (const i of forRange(3, actualArgumentCount)) {
        list[j] = select(i, ...args) as T;
        j++;
    }

    for (let k = list.length - 1; k >= len - actualDeleteCount + itemCount; k--) {
        list[k] = undefined;
    }

    return out;
}
