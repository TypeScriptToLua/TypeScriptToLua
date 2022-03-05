export function __TS__ArrayConcat(this: void, arr1: any[], ...args: any[]): any[] {
    const out: any[] = [];
    for (const val of arr1) {
        out[out.length] = val;
    }
    for (const arg of args) {
        if (Array.isArray(arg)) {
            const argAsArray = arg;
            for (const val of argAsArray) {
                out[out.length] = val;
            }
        } else {
            out[out.length] = arg;
        }
    }

    return out;
}
