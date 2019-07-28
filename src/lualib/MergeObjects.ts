function __TS__MergeObjects(this: void, ...objects: object[]): object {
    const obj = {};
    if (objects.length > 0) {
        for (const object of objects) {
            for (const key in object) {
                obj[key] = object[key];
            }
        }
    }
    return obj;
}
