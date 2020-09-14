// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
function __TS__ObjectDefineProperty(this: void, target: any, key: any, desc: PropertyDescriptor): object {
    const clone = __TS__CloneDescriptor(desc);
    const luaKey = typeof key === "number" ? key + 1 : key;
    if (!(clone.get || clone.set) && desc.value === undefined) clone.value = target[luaKey];
    __TS__SetDescriptor(target, luaKey, clone);
    return target;
}
