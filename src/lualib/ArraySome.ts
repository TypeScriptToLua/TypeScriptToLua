function __TS__ArraySome<T>(arr: T[], callbackfn: (value: T, index?: number, array?: any[]) => void, thisArg?: any) {
    for (let i = 0; i < arr.length; i++) {
        if (callbackfn(arr[i], i, arr)) {
            return true;
        }
    }
    return false;
}
