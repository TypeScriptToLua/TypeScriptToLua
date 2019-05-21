function __TS__ObjectRest<K extends keyof any, V>(
    this: void,
    target: Record<K, V>,
    usedProperties: Partial<Record<K, true>>
): Partial<Record<K, V>> {
    const result: Partial<Record<K, V>> = {};
    for (const property in target) {
        if (!usedProperties[property]) {
            result[property] = target[property];
        }
    }

    return result;
}
