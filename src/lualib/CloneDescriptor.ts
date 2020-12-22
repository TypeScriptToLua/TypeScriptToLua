function __TS__CloneDescriptor(
    this: void,
    { enumerable, configurable, get, set, writable, value }: PropertyDescriptor
): PropertyDescriptor {
    const descriptor: PropertyDescriptor = {
        enumerable: enumerable === true,
        configurable: configurable === true,
    };

    const hasGetterOrSetter = get !== undefined || set !== undefined;
    const hasValueOrWritableAttribute = writable !== undefined || value !== undefined;

    if (hasGetterOrSetter && hasValueOrWritableAttribute) {
        throw "Invalid property descriptor. Cannot both specify accessors and a value or writable attribute.";
    }

    if (get || set) {
        descriptor.get = get;
        descriptor.set = set;
    } else {
        descriptor.value = value;
        descriptor.writable = writable === true;
    }

    return descriptor;
}
