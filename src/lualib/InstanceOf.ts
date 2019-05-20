function __TS__InstanceOf(this: void, obj: LuaObject, classTbl: LuaClass): boolean {
    if (typeof classTbl !== "object") {
        // tslint:disable-next-line: no-string-throw
        throw "Right-hand side of 'instanceof' is not an object";
    }

    if (classTbl[Symbol.hasInstance] !== undefined) {
        return !!classTbl[Symbol.hasInstance](obj);
    }

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
