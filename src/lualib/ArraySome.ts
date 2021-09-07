function __TS__ArraySome<T>(
    this: void,
    arr: T[],
    callbackfn: (value: T, index?: number, array?: any[]) => boolean
): boolean {
    for (const i of $range(1, arr.length)) {
        if (callbackfn(arr[i - 1], i - 1, arr)) {
            return true;
        }
    }
    return false;
}
