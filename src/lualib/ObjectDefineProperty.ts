// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
function __TS__ObjectDefineProperty(
    this: void,
    object: object,
    prop: string,
    descriptor: Readonly<PropertyDescriptor>
): object {
    let metatable = getmetatable(object);
    if (!metatable) {
        metatable = {};
        setmetatable(object, metatable);
    }

    const clone = __TS__CloneDescriptor(descriptor);
    if (descriptor.value === undefined) clone.value = object[prop];
    if (object[prop] !== undefined) object[prop] = undefined;
    __TS__SetDescriptor(metatable, prop, clone);
    return object;
}
