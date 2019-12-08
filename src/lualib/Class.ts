function __TS__Class(): LuaClass {
    const c = {} as LuaClass;
    c.__index = c;
    c.prototype = {};
    c.prototype.__index = c.prototype;
    c.prototype.constructor = c;
    return c;
}
