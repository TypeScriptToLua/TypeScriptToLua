// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
function __TS__ObjectDefineProperty(this: void, target: any, key: any, desc: PropertyDescriptor): object {
    const luaKey = typeof key === "number" ? key + 1 : key;
    const value = rawget(target, luaKey);

    const hasGetterOrSetter = desc.get !== undefined || desc.set !== undefined;

    let descriptor: PropertyDescriptor;
    if (hasGetterOrSetter) {
        if (value !== undefined) {
            throw `Cannot redefine property: ${key}`;
        }

        descriptor = desc;
    } else {
        if (value !== undefined) {
            descriptor = {
                configurable: desc.configurable !== undefined ? desc.configurable : true,
                enumerable: desc.enumerable !== undefined ? desc.enumerable : true,
                writable: desc.writable !== undefined ? desc.writable : true,
                value: desc.value !== undefined ? desc.value : value,
            };
        } else {
            descriptor = {
                configurable: desc.configurable !== undefined ? desc.configurable : false,
                enumerable: desc.enumerable !== undefined ? desc.enumerable : false,
                writable: desc.writable !== undefined ? desc.writable : false,
                value: desc.value !== undefined ? desc.value : value,
            };
        }
    }

    __TS__SetDescriptor(target, luaKey, descriptor);
    return target;
}
