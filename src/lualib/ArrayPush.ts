function __TS__ArrayPush<T>(this: void, arr: T[], ...items: T[]): number {
    for (const item of items) {
        arr[arr.length] = item;
    }
    return arr.length;
}
