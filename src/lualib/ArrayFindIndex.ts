function __TS__ArrayFindIndex<T>(
    arr: T[],
    callbackFn: (this: void, element: T, index?: number, array?: T[]) => boolean
): number {
    for (let i = 0, len = arr.length; i < len; i++) {
        if (callbackFn(arr[i], i, arr)) {
            return i;
        }
    }
    return -1;
}
