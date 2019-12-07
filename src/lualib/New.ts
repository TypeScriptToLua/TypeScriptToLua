function __TS__New(this: void, target: LuaClass, ...args: Vararg<any>): any {
    const instance: any = setmetatable({}, target.prototype);
    instance.____constructor(...args);
    return instance;
}
