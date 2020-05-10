function __TS__InstanceOf(this: void, obj: LuaClassInstance, classTbl: LuaClass): boolean {
    if (typeof classTbl !== "object") {
        throw "Right-hand side of 'instanceof' is not an object";
    }

    if (classTbl[Symbol.hasInstance] !== undefined) {
        // eslint-disable-next-line no-implicit-coercion
        return !!classTbl[Symbol.hasInstance](obj);
    }

    if (typeof obj === "object") {
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
