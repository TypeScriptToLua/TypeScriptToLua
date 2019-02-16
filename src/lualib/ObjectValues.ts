function __TS__ObjectValues(obj: any): Array<string | number> {
    const result = [];
    for (const key in obj) {
        result[result.length] = obj[key];
    }
    return result;
}
