export function __TS__ArrayMap<T, U>(
    this: T[],
    callbackfn: (value: T, index?: number, array?: T[]) => U,
    thisArg?: any
): U[] {
    const result: U[] = [];
    for (const i of $range(1, this.length)) {
        result[i - 1] = callbackfn.call(thisArg, this[i - 1], i - 1, this);
    }
    return result;
}
