// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
function __TS__ObjectDefineProperty(this: void, target: any, key: any, desc: PropertyDescriptor): object {
    const clone = __TS__CloneDescriptor(desc);
    if (!(clone.get || clone.set) && desc.value === undefined) clone.value = target[key];
    __TS__SetDescriptor(target, key, clone);
    return target;
}
