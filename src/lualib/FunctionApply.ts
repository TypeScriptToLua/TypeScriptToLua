function __TS__FunctionApply(this: void, fn: (this: void, ...args: any[]) => any, thisArg: any, args?: any[]): any {
    if (args) {
        return fn(thisArg, ...args);
    } else {
        return fn(thisArg);
    }
}
