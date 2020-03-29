function __TS__Class(): LuaClass {
    const c: LuaClass = { prototype: {} };
    c.prototype.__index = c.prototype;
    c.prototype.constructor = c;
    return c;
}
