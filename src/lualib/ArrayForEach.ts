export function __TS__ArrayForEach<T>(
    this: T[],
    callbackFn: (value: T, index?: number, array?: any[]) => any,
    thisArg?: any
): void {
    for (const i of $range(1, this.length)) {
        callbackFn.call(thisArg, this[i - 1], i - 1, this);
    }
}
