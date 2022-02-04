export function __TS__ArrayEvery<T>(
    this: T[],
    callbackfn: (value: T, index?: number, array?: any[]) => boolean,
    thisArg?: any
): boolean {
    for (const i of $range(1, this.length)) {
        if (!callbackfn.call(thisArg, this[i - 1], i - 1, this)) {
            return false;
        }
    }
    return true;
}
