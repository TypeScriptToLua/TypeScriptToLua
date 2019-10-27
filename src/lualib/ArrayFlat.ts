function __TS__ArrayFlat(this: void, array: any[], depth = 1): any[] {
    let result: any[] = [];
    for (const value of array) {
        if (
            depth > 0 &&
            type(value) === "table" &&
            // Workaround to determine if value is an array or not (fails in case of objects without keys)
            // See discussion in: https://github.com/TypeScriptToLua/TypeScriptToLua/pull/737
            (1 in value || (next as NextEmptyCheck)(value, undefined) === undefined)
        ) {
            result = result.concat(__TS__ArrayFlat(value, depth - 1));
        } else {
            result[result.length] = value;
        }
    }

    return result;
}
