function __TS__ArraySetLength<T>(this: void, arr: T[], length: number): number {
    if (length < 0) {
        throw `invalid array length: ${length}`;
    }
    for (let i = arr.length - 1; i >= length; --i) {
        arr[i] = undefined;
    }
    return length;
}
