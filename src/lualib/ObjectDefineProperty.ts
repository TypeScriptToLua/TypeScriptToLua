// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty

import { __TS__SetDescriptor } from "./SetDescriptor";

export function __TS__ObjectDefineProperty<T extends object>(
    this: void,
    target: T,
    key: any,
    desc: PropertyDescriptor
): T {
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
        const valueExists = value !== undefined;
        descriptor = {
            set: desc.set,
            get: desc.get,
            configurable: desc.configurable ?? valueExists,
            enumerable: desc.enumerable ?? valueExists,
            writable: desc.writable ?? valueExists,
            value: desc.value !== undefined ? desc.value : value,
        };
    }

    __TS__SetDescriptor(target, luaKey, descriptor);
    return target;
}
