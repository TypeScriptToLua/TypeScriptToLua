declare namespace table {
    /** !NoContext */
    function sort<T>(arr: T[], compareFn?: (a: T, b: T) => number): void;
}
/** !NoContext */
function __TS__ArraySort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
    table.sort(arr, compareFn);
    return arr;
}
