declare namespace table {
    function remove<T>(arr: T[], idx: number): T;
}
function __TS__ArrayShift<T>(arr: T[]): T {
    return table.remove(arr, 1);
}
