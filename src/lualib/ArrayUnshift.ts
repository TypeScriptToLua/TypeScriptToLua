declare namespace table {
    /** !NoContext */
    function insert<T>(arr: T[], idx: number, val: T): void;
}
/** !NoContext */
function __TS__ArrayUnshift<T>(arr: T[],  ...items: T[]): number {
    for (let i = items.length - 1; i >= 0; --i) {
        table.insert(arr, 1, items[i]);
    }
    return arr.length;
}
