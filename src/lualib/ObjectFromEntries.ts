function __TS__ObjectFromEntries<T>(
    this: void,
    entries: ReadonlyArray<[string, T]> | Iterable<[string, T]>
): Record<string, T> {
    const obj: Record<string, T> = {};

    const iterable = entries as Iterable<[string, T]>;
    if (iterable[Symbol.iterator]) {
        const iterator = iterable[Symbol.iterator]();
        while (true) {
            const result = iterator.next();
            if (result.done) break;

            const value: [string, T] = result.value;
            obj[value[0]] = value[1];
        }
    } else {
        for (const entry of entries as ReadonlyArray<[string, T]>) {
            obj[entry[0]] = entry[1];
        }
    }

    return obj;
}
