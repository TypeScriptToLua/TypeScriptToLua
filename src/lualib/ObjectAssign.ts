// https://tc39.github.io/ecma262/#sec-object.assign
function __TS__ObjectAssign<T extends object>(to: T, ...sources: object[]): T {
    if (to === undefined) {
        return to;
    }

    for (const source of sources) {
        for (const key in source) {
            to[key] = source[key];
        }
    }

    return to;
}
