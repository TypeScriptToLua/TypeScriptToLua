function __TS__ArrayFindIndex<T>(
    this: void,
    arr: T[],
    callbackFn: (element: T, index?: number, array?: T[]) => boolean
): number {
    for (const i of $range(1, arr.length)) {
        if (callbackFn(arr[i - 1], i - 1, arr)) {
            return i - 1;
        }
    }
    return -1;
}
