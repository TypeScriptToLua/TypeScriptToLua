export function __TS__MapGroupBy<K, T>(
    this: void,
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K
): Map<K, T[]> {
    const result = new Map<K, T[]>();

    let i = 0;
    for (const item of items) {
        const key = keySelector(item, i);

        if (result.has(key)) {
            result.get(key)!.push(item);
        } else {
            result.set(key, [item]);
        }

        i++;
    }

    return result;
}
