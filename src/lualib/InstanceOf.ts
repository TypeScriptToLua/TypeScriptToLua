interface LuaClass {
    ____super?: LuaClass;
}

interface LuaObject {
    constructor: LuaClass;
}

function __TS__InstanceOf(obj: LuaObject, classTbl: LuaClass): boolean {
    if (obj !== undefined) {
        let luaClass = obj.constructor;
        while (luaClass !== undefined) {
            if (luaClass === classTbl) {
                return true;
            }
            luaClass = luaClass.____super;
        }
    }
    return false;
}
