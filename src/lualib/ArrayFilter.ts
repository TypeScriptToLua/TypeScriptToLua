export function __TS__ArrayFilter<T>(
    this: T[],
    callbackfn: (value: T, index?: number, array?: any[]) => boolean,
    thisArg?: any
): T[] {
    const result: T[] = [];
    let len = 0;
    for (const i of $range(1, this.length)) {
        if (callbackfn.call(thisArg, this[i - 1], i - 1, this)) {
            len++;
            result[len - 1] = this[i - 1];
        }
    }
    return result;
}
