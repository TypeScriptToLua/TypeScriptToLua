function __TS__ObjectKeys(this: void, obj: any): Array<string | number> {
    const result = [];
    for (const key in obj) {
        result[result.length] = key;
    }
    return result;
}
