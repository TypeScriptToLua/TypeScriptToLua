function __TS__ArrayPush<T>(arr: T[], ...items: T[]) {
    for (const item of items) {
        arr[arr.length] = item;
    }
}
