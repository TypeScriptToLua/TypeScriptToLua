function __TS__ObjectKeys(obj: any): Array<string | number> {
    const result = [];
    for (const key in obj) {
        result[result.length] = key;
    }
    return result;
}
