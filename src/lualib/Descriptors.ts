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

                return;
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
                }

                return;
            }
        }

        metatable = getmetatable(metatable);
    }

    rawset(this, key, value);
}

// It's also used directly in class transform to add descriptors to the prototype
function __TS__SetDescriptor(this: void, metatable: Metatable, prop: string, descriptor: PropertyDescriptor): void {
    if (!rawget(metatable, "_descriptors")) metatable._descriptors = {};
    metatable._descriptors[prop] = descriptor;

    if (descriptor.get) metatable.__index = ____descriptorIndex;
    if (descriptor.set) metatable.__newindex = ____descriptorNewindex;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
function __TS__ObjectDefineProperty<T extends object>(
    this: void,
    object: T,
    prop: string,
    descriptor: PropertyDescriptor
): T {
    let metatable = getmetatable(object);
    if (!metatable) {
        metatable = {};
        setmetatable(object, metatable);
    }

    __TS__SetDescriptor(metatable, prop, descriptor);
    return object;
}
