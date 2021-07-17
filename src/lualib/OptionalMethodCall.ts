function __TS__OptionalMethodCall<TArgs extends any[], TReturn>(
    this: void,
    table: Record<string, (...args: [...TArgs]) => TReturn>,
    methodName: string,
    ...args: [...TArgs]
): TReturn | undefined {
    if (table) {
        const method = table[methodName];
        if (method) {
            return method.call(table, ...args);
        }
    }
    return undefined;
}
