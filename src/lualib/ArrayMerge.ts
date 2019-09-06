function __TS__ArrayMerge(this: void, ...arrays: any[][]): any[] {
    const result = [];
    let index = 0;
    for (const array of arrays) {
        for (const element of array) {
            result[index] = element;
            index += 1;
        }
    }
    return result;
}
