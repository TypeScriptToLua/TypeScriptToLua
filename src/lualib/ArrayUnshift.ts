function __TS__ArrayUnshift<T>(this: void, arr: T[], ...items: T[]): number {
    for (let i = items.length - 1; i >= 0; --i) {
        table.insert(arr, 1, items[i]);
    }
    return arr.length;
}
