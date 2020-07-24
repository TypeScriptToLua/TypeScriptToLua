function ____descriptorIndex(this: any, key: string): void {
    const value = rawget(this, key);
    if (value !== null) {
        return value;
    }

    let metatable = getmetatable(this);
    while (metatable) {
        const rawResult = rawget(metatable, key);
        if (rawResult !== undefined) {
            return rawResult;
        }

        const descriptors = rawget(metatable, "_descriptors");
        if (descriptors) {
            const descriptor: PropertyDescriptor = descriptors[key];
            if (descriptor) {
                if (descriptor.get) {
                    return descriptor.get.call(this);
                }

                return descriptor.value;
            }
        }

        metatable = getmetatable(metatable);
    }
}

function ____descriptorNewindex(this: any, key: string, value: any): void {
    let metatable = getmetatable(this);
    while (metatable) {
        const descriptors = rawget(metatable, "_descriptors");
        if (descriptors) {
            const descriptor: PropertyDescriptor = descriptors[key];
            if (descriptor) {
                if (descriptor.set) {
                    descriptor.set.call(this, value);
                } else {
                    if (descriptor.writable === false) {
                        throw `Cannot assign to read only property '${key}' of object '${this}'`;
                    }

                    descriptor.value = value;
                }
                return;
            }
        }

        metatable = getmetatable(metatable);
    }

    rawset(this, key, value);
}

// It's also used directly in class transform to add descriptors to the prototype
function __TS__SetDescriptor(this: void, target: any, key: any, desc: PropertyDescriptor, isPrototype = false): void {
    let metatable = isPrototype ? target : getmetatable(target);
    if (!metatable) {
        metatable = {};
        setmetatable(target, metatable);
    }

    const value = rawget(target, key);
    if (value !== undefined) rawset(target, key, undefined);

    if (!rawget(metatable, "_descriptors")) metatable._descriptors = {};
    const descriptor = __TS__CloneDescriptor(desc);
    metatable._descriptors[key] = descriptor;
    metatable.__index = ____descriptorIndex;
    metatable.__newindex = ____descriptorNewindex;
}
