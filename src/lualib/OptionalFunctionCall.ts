function __TS__OptionalFunctionCall<TArgs extends any[], TReturn>(
    this: void,
    f: (this: void, ...args: [...TArgs]) => TReturn,
    ...args: [...TArgs]
): TReturn | undefined {
    if (f) {
        return f(...args);
    }
    return undefined;
}
