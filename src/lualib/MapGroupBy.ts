export function __TS__MapGroupBy<K, T>(
    this: void,
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K
): Map<K, T[]> {
    return new Map();
}
