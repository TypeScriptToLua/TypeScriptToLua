function __TS__ArrayFindIndex<T>(
    this: void,
    arr: T[],
    callbackFn: (element: T, index?: number, array?: T[]) => boolean
): number {
    for (let i = 0, len = arr.length; i < len; i++) {
        if (callbackFn(arr[i], i, arr)) {
            return i;
        }
    }
    return -1;
}
