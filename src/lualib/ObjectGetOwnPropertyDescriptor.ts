function __TS__ObjectGetOwnPropertyDescriptor(
    this: void,
    object: object,
    prop: string
): PropertyDescriptor | undefined {
    const metatable = getmetatable(object);
    if (!metatable) return;
    if (!rawget(metatable, "_descriptors")) return;
    return rawget(metatable, "_descriptors")[prop];
}
