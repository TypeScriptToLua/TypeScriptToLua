function __TS__ArrayToObject(this: void, array: any[]): object {
    const object: Record<number, any> = {};
    for (let i = 0; i < array.length; i += 1) {
        object[i] = array[i];
    }
    return object;
}
