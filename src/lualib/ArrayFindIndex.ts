export function __TS__ArrayFindIndex<T>(
    this: T[],
    callbackFn: (element: T, index?: number, array?: T[]) => boolean,
    thisArg?: any
): number {
    for (const i of $range(1, this.length)) {
        if (callbackFn.call(thisArg, this[i - 1], i - 1, this)) {
            return i - 1;
        }
    }
    return -1;
}
