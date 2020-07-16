function __TS__Delete(this: void, target: object, prop: string): boolean {
    const descriptors = __TS__ObjectGetOwnPropertyDescriptors(target);
    if (descriptors) {
        const descriptor = descriptors[prop];
        if (descriptor) {
            if (!descriptor.configurable) {
                throw `Cannot delete property ${prop} of ${target}.`;
            }

            descriptors[prop] = undefined;
            return true;
        }
    } else {
        if (target[prop] !== undefined) {
            target[prop] = undefined;
            return true;
        }
    }

    return false;
}
