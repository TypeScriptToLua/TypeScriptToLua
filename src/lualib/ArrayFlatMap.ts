function __TS__ArrayFlatMap<T, U>(
    this: void,
    array: T[],
    callback: (value: T, index: number, array: T[]) => U | readonly U[]
): U[] {
    let result: U[] = [];
    for (let i = 0; i < array.length; i++) {
        const value = callback(array[i], i, array);
        if (type(value) === "table") {
            result = result.concat(value);
        } else {
            result[result.length] = value as U;
        }
    }

    return result;
}
