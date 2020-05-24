function __TS__FunctionBind(
    this: void,
    fn: (this: void, ...argArray: any[]) => any,
    thisArg: any,
    ...boundArgs: any[]
): (...args: any[]) => any {
    return (...args: any[]) => {
        for (let i = 0; i < boundArgs.length; ++i) {
            table.insert(args, i + 1, boundArgs[i]);
        }
        return fn(thisArg, ...args);
    };
}
