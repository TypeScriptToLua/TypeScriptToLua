export function __TS__ArrayUnshift<T>(this: T[], ...items: T[]): number {
    const numItemsToInsert = items.length;
    if (numItemsToInsert === 0) return this.length;

    for (const i of $range(this.length, 1, -1)) {
        this[i + numItemsToInsert - 1] = this[i - 1];
    }
    for (const i of $range(1, numItemsToInsert)) {
        this[i - 1] = items[i - 1];
    }
    return this.length;
}
