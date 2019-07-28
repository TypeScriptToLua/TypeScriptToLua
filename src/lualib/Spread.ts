function __TS__Spread<T>(this: void, iterable: Iterable<T>): T[] {
    const arr = [];
    if (typeof iterable === "string") {
        for (const [character] of string.gmatch(iterable, ".")) {
            arr[arr.length] = character;
        }
    } else {
        for (const item of iterable) {
            arr[arr.length] = item;
        }
    }
    return (table.unpack || unpack)(arr);
}
