declare namespace table {
    function sort<T>(this: void, arr: T[], compareFn?: (a: T, b: T) => number): void;
}
function __TS__ArraySort<T>(this: void, arr: T[], compareFn?: (a: T, b: T) => number): T[] {
    table.sort(arr, compareFn);
    return arr;
}
