function __TS__ArrayMap<T, U>(this: void, arr: T[], callbackfn: (value: T, index?: number, array?: T[]) => U): U[] {
    const newArray: U[] = [];
    for (let i = 0; i < arr.length; i++) {
        newArray[i] = callbackfn(arr[i], i, arr);
    }
    return newArray;
}
