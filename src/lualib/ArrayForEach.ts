function __TS__ArrayForEach<T>(arr: T[], callbackFn: (value: T, index?: number, array?: any[]) => void, thisArg?: any) {
    for (let i = 0; i < arr.length; i++) {
        callbackFn(arr[i], i, arr);
    }
}
