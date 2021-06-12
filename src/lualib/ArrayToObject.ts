function __TS__ArrayToObject<T>(this: void, array: T[]): Record<number, T> {
    const object: Record<number, any> = {};
    for (let i = 0; i < array.length; i += 1) {
        object[i] = array[i];
    }
    return object;
}
