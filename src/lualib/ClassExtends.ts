function __TS__ClassExtends(this: void, target: LuaClass, base: LuaClass): void {
    target.____super = base;

    const staticMetatable: any = setmetatable({ __index: base }, base);
    setmetatable(target, staticMetatable);
    const baseMetatable = getmetatable(base);
    if (baseMetatable) {
        if (typeof baseMetatable.__index === "function") {
            staticMetatable.__index = baseMetatable.__index;
        }

        if (typeof baseMetatable.__newindex === "function") {
            staticMetatable.__newindex = baseMetatable.__newindex;
        }
    }

    setmetatable(target.prototype, base.prototype);
    if (typeof base.prototype.__index === "function") target.prototype.__index = base.prototype.__index;
    if (typeof base.prototype.__newindex === "function") target.prototype.__newindex = base.prototype.__newindex;
}
