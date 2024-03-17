export function __TS__ObjectGroupBy<K extends PropertyKey, T>(
    this: void,
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K
): Partial<Record<K, T[]>> {
    const result: Partial<Record<K, T[]>> = {};

    let i = 0;
    for (const item of items) {
        const key = keySelector(item, i);

        if (key in result) {
            result[key]!.push(item);
        } else {
            result[key] = [item];
        }

        i++;
    }

    return result;
}
