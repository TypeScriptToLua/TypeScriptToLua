export function __TS__FunctionBind(
    this: void,
    fn: (this: void, ...argArray: any[]) => any,
    ...boundArgs: any[]
): (...args: any[]) => any {
    if (typeof boundArgs[0] === "object") {
        const address = tostring(fn);
        const bound = boundArgs[0];
        if (!bound.__TS__wrappedMethods) bound.__TS__wrappedMethods = {};
        if (!bound.__TS__wrappedMethods[address]) {
            bound.__TS__wrappedMethods[address] = (...args: any[]) => {
                args.unshift(...boundArgs);
                return fn(...args);
            };
        }
        return bound.__TS__wrappedMethods[address];
    }

    return (...args: any[]) => {
        args.unshift(...boundArgs);
        return fn(...args);
    };
}
