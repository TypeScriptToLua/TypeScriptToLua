export function __TS__ArrayConcat<T>(this: T[], ...items: Array<T | T[]>): T[] {
    const result: T[] = [];
    let len = 0;
    for (const i of $range(1, this.length)) {
        len++;
        result[len - 1] = this[i - 1];
    }
    for (const i of $range(1, items.length)) {
        const item = items[i - 1];
        if (Array.isArray(item)) {
            for (const j of $range(1, item.length)) {
                len++;
                result[len - 1] = item[j - 1];
            }
        } else {
            len++;
            result[len - 1] = item;
        }
    }

    return result;
}
