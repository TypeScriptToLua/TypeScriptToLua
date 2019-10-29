function __TS__ArrayFlatMap<T, U>(
    this: void,
    array: T[],
    callback: (value: T, index: number, array: T[]) => U | readonly U[]
): U[] {
    let result: U[] = [];
    for (let i = 0; i < array.length; i++) {
        const value = callback(array[i], i, array);
        if (
            type(value) === "table" &&
            // Workaround to determine if value is an array or not (fails in case of objects without keys)
            // See discussion in: https://github.com/TypeScriptToLua/TypeScriptToLua/pull/737
            (1 in value || (next as NextEmptyCheck)(value as any, undefined) === undefined)
        ) {
            result = result.concat(value);
        } else {
            result[result.length] = value as U;
        }
    }

    return result;
}
