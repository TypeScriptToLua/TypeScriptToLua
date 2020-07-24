function __TS__ObjectGetOwnPropertyDescriptor(this: void, object: any, key: any): PropertyDescriptor | undefined {
    const metatable = getmetatable(object);
    if (!metatable) return;
    if (!rawget(metatable, "_descriptors")) return;
    return rawget(metatable, "_descriptors")[key];
}
