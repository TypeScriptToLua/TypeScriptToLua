// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
function __TS__ObjectDefineProperty(this: void, object: object, prop: string, desc: PropertyDescriptor): object {
    const [clone, isGetSet] = __TS__CloneDescriptor(desc);
    if (!isGetSet && desc.value === undefined) clone.value = object[prop];
    __TS__SetDescriptor(object, prop, clone);
    return object;
}
