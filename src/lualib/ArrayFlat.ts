function __TS__ArrayFlat(this: void, array: any[], depth = 1): any[] {
    let result: any[] = [];
    for (const value of array) {
        // A hack to concat only true "arrays" and empty tables.
        if (depth > 0 && type(value) === "table" && (1 in value || next(value, undefined) === undefined)) {
            result = result.concat(__TS__ArrayFlat(value, depth - 1));
        } else {
            result[result.length] = value;
        }
    }

    return result;
}
