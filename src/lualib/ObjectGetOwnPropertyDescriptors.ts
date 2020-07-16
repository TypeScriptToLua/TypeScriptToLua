function __TS__ObjectGetOwnPropertyDescriptors<T extends object>(
    this: void,
    object: T
): Record<keyof T, PropertyDescriptor | undefined> {
    const metatable = getmetatable(object);
    if (!metatable) return;
    return rawget(metatable, "_descriptors");
}
