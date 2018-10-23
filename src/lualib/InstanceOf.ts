interface LuaClass {
    __index: LuaClass;
    __base: LuaClass;
}

/** !NoContext */
function __TS__InstanceOf(obj: LuaClass, classTbl: LuaClass): boolean {
    while (obj !== undefined) {
        if (obj.__index === classTbl) {
            return true;
        }
        obj = obj.__base;
    }
    return false;
}
