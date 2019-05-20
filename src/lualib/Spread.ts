function __TS__Spread<T>(this: void, iterable: Iterable<T>): T[] {
    const arr: T[] = [];
    for (const item of iterable) {
        arr[arr.length] = item;
    }
    return (table.unpack || unpack)(arr);
}
