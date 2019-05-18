function __TS__FunctionCall(
    this: void,
    fn: (this: void, ...args: any[]) => any,
    thisArg: any,
    ...args: any[]
): any {
    return fn(thisArg, (unpack || table.unpack)(args));
}
