function __TS__ArrayFlatMap<T, U>(
    this: void,
    array: T[],
    callback: (value: T, index: number, array: T[]) => U | readonly U[]
): U[] {
    let result: U[] = [];
    for (let i = 0; i < array.length; i++) {
        const value = callback(array[i], i, array);
        // A hack to concat only true "arrays" and empty tables.
        if (type(value) === "table" && (1 in value || next(value as any, undefined) === undefined)) {
            result = result.concat(value);
        } else {
            result[result.length] = value as U;
        }
    }

    return result;
}
