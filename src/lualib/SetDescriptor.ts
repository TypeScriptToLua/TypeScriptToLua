import { __TS__CloneDescriptor } from "./CloneDescriptor";
import { __TS__DescriptorGet } from "./DescriptorGet";
import { __TS__DescriptorSet } from "./DescriptorSet";

const getmetatable = _G.getmetatable;

function descriptorIndex(this: any, key: string): void {
    return __TS__DescriptorGet.call(this, getmetatable(this), key);
}

function descriptorNewIndex(this: any, key: string, value: any): void {
    return __TS__DescriptorSet.call(this, getmetatable(this), key, value);
}

// It's also used directly in class transform to add descriptors to the prototype
export function __TS__SetDescriptor(
    this: void,
    target: any,
    key: any,
    desc: PropertyDescriptor,
    isPrototype = false
): void {
    let metatable = isPrototype ? target : getmetatable(target);
    if (!metatable) {
        metatable = {};
        setmetatable(target, metatable);
    }

    const value = rawget(target, key);
    if (value !== undefined) rawset(target, key, undefined);

    if (!rawget(metatable, "_descriptors")) metatable._descriptors = {};
    metatable._descriptors[key] = __TS__CloneDescriptor(desc);
    metatable.__index = descriptorIndex;
    metatable.__newindex = descriptorNewIndex;
}
