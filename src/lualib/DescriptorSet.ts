const getmetatable = _G.getmetatable;
const rawget = _G.rawget;
const rawset = _G.rawset;

export function __TS__DescriptorSet(this: any, metatable: any, key: string, value: any): void {
    while (metatable) {
        const descriptors = rawget(metatable, "_descriptors");
        if (descriptors) {
            const descriptor: PropertyDescriptor = descriptors[key];
            if (descriptor !== undefined) {
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
