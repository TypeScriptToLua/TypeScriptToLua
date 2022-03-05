export function __TS__ArrayFlat(this: void, array: any[], depth = 1): any[] {
    let result: any[] = [];
    for (const value of array) {
        if (depth > 0 && Array.isArray(value)) {
            result = result.concat(__TS__ArrayFlat(value, depth - 1));
        } else {
            result[result.length] = value;
        }
    }

    return result;
}
