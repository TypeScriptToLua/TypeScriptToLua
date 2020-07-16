function __TS__CloneDescriptor(this: void, desc: Readonly<PropertyDescriptor>): PropertyDescriptor {
    const descriptor: PropertyDescriptor = {
        enumerable: desc.enumerable === true,
        configurable: desc.configurable === true,
    };

    const hasGetterOrSetter = desc.get !== undefined || desc.set !== undefined;
    const hasValueOrWritableAttribute = desc.writable !== undefined || desc.value !== undefined;

    if (hasGetterOrSetter && hasValueOrWritableAttribute) {
        throw `Invalid property descriptor. Cannot both specify accessors and a value or writable attribute, ${this}.`;
    }

    if (desc.get || desc.set) {
        descriptor.get = desc.get;
        descriptor.set = desc.set;
    } else {
        descriptor.value = desc.value;
        descriptor.writable = desc.writable !== undefined && desc.writable !== false;
    }

    return descriptor;
}
