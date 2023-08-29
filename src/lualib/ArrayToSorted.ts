export function __TS__ArrayToSorted<T>(this: T[], compareFn?: (a: T, b: T) => number): T[] {
    const copy = [...this];
    copy.sort(compareFn);
    return copy;
}
