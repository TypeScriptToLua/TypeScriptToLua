export function __TS__ObjectEntries<TKey extends string | number, TValue>(
    this: void,
    obj: Record<TKey, TValue>
): Array<[TKey, TValue]> {
    const result: Array<[TKey, TValue]> = [];
    let len = 0;
    for (const key in obj) {
        len++;
        result[len - 1] = [key, obj[key]];
    }
    return result;
}
