function __TS__Delete(this: void, target: object, prop: string): boolean {
    const metatable = getmetatable(target) as Metatable | undefined;
    if (!metatable) {
        if (target[prop] !== undefined) {
            target[prop] = undefined;
            return true;
        }

        return false;
    }

    const descriptors = rawget(metatable, "_descriptors");
    if (descriptors) {
        const descriptor = descriptors[prop];
        if (descriptor) {
            if (!descriptor.configurable) {
                throw `Cannot delete property ${prop} of ${target}.`;
            }

            descriptors[prop] = undefined;
            return true;
        }
    }

    return false;
}
