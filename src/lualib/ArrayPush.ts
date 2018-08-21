function __TS__ArrayPush<T>(arr: T[], ...items: T[]): number {
    /* tslint:disable */
    for (let i = 0; i < items.length; i++) {
    /* tslint:enable */
        arr[arr.length] = items[i];
    }
    return arr.length;
}
