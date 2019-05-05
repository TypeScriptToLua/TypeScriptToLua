function __TS__ObjectRest<K extends keyof any, V>(
    this: void,
    target: Record<K, V>,
    usedProperties: K[]
): Partial<Record<K, V>> {
    const result: Partial<Record<K, V>> = {};
    for (const property in target) {
        let isUsed = false;
        for (const usedProperty of usedProperties) {
            if (property === usedProperty) {
                isUsed = true;
                break;
            }
        }

        if (!isUsed) {
            result[property] = target[property];
        }
    }

    return result;
}
