const getmetatable = _G.getmetatable;
const rawget = _G.rawget;

export function __TS__DescriptorGet(this: any, metatable: any, key: string): void {
    while (metatable) {
        const rawResult = rawget(metatable, key as any);
        if (rawResult !== undefined) {
            return rawResult;
        }

        const descriptors = rawget(metatable, "_descriptors");
        if (descriptors) {
            const descriptor: PropertyDescriptor = descriptors[key];
            if (descriptor !== undefined) {
                if (descriptor.get) {
                    return descriptor.get.call(this);
                }

                return descriptor.value;
            }
        }

        metatable = getmetatable(metatable);
    }
}
