function __TS__ObjectGetOwnPropertyDescriptors(this: void, object: any): Record<any, PropertyDescriptor | undefined> {
    const metatable = getmetatable(object);
    if (!metatable) return {};
    return rawget(metatable, "_descriptors");
}
