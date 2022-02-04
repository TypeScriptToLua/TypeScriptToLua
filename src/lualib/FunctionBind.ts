export function __TS__FunctionBind(
    this: void,
    fn: (this: void, ...argArray: any[]) => any,
    ...boundArgs: any[]
): (...args: any[]) => any {
    return (...args: any[]) => {
        args.unshift(...boundArgs);
        return fn(...args);
    };
}
