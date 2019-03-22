function __TS__ObjectValues(this: void, obj: any): Array<string | number> {
    const result = [];
    for (const key in obj) {
        result[result.length] = obj[key];
    }
    return result;
}
