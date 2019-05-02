function __TS__InstanceOfObject(this: void, value: unknown): boolean {
    const valueType = type(value);
    return valueType === "table" || valueType === "function";
}
