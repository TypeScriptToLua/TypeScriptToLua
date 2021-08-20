function __TS__OptionalMethodCall<TArgs extends any[], TReturn>(
    this: void,
    table: Record<string, (...args: [...TArgs]) => TReturn>,
    methodName: string,
    isMethodOptional: boolean,
    ...args: [...TArgs]
): TReturn | undefined {
    if (table) {
        const method = table[methodName];
        if (method) {
            return method.call(table, ...args);
        } else if (!isMethodOptional) {
            throw `${methodName} is not a function`;
        }
    }
    return undefined;
}
