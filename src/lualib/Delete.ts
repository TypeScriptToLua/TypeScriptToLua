function __TS__Delete(this: void, target: any, key: any): boolean {
    const descriptors = __TS__ObjectGetOwnPropertyDescriptors(target);
    if (descriptors) {
        const descriptor = descriptors[key];
        if (descriptor) {
            if (!descriptor.configurable) {
                throw `Cannot delete property ${key} of ${target}.`;
            }

            descriptors[key] = undefined;
            return true;
        }
    } else {
        if (target[key] !== undefined) {
            target[key] = undefined;
            return true;
        }
    }

    return false;
}
