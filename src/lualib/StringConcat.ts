function __TS__StringConcat(this: void, str1: string, ...args: string[]): string {
    let out = str1;
    for (const arg of args) {
        out += arg;
    }
    return out;
}
