export function __TS__ArraySort<T>(this: T[], compareFn?: (a: T, b: T) => number): T[] {
    if (compareFn !== undefined) {
        table.sort(this, (a, b) => compareFn(a, b) < 0);
    } else {
        table.sort(this);
    }
    return this;
}
