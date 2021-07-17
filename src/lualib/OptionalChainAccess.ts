function __TS__OptionalChainAccess<TKey extends string, TReturn>(
    this: void,
    table: Record<TKey, TReturn>,
    key: TKey
): TReturn | undefined {
    if (table) {
        return table[key];
    }
    return undefined;
}
