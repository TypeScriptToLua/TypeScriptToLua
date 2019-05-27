function __TS__ArrayForEach<T>(
    this: void,
    arr: T[],
    callbackFn: (value: T, index?: number, array?: any[]) => any
): void {
    for (let i = 0; i < arr.length; i++) {
        callbackFn(arr[i], i, arr);
    }
}
