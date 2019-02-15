function __TS__ObjectEntries(obj: any): Array<string | number> {
    const result = [];
    for (const key in obj) {
        result[result.length] = [key, obj[key]];
    }
    return result;
}
