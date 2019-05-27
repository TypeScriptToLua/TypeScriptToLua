function __TS__ArrayFilter<T>(
    this: void,
    arr: T[],
    callbackfn: (value: T, index?: number, array?: any[]) => boolean
): T[] {
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
        if (callbackfn(arr[i], i, arr)) {
            result[result.length] = arr[i];
        }
    }
    return result;
}
