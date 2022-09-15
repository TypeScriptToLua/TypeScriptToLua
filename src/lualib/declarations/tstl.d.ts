/** @noSelfInFile */

interface LuaMetatable {
    _descriptors?: Record<string, PropertyDescriptor>;
    __index?: any;
    __newindex?: any;
    __tostring?: any;
    __errorToStringPatched?: boolean;
}

interface LuaClass extends LuaMetatable<any> {
    prototype: LuaClassInstance;
    [Symbol.hasInstance]?(instance: LuaClassInstance): any;
    ____super?: LuaClass;
}

interface LuaClassInstance extends LuaMetatable<any> {
    constructor: LuaClass;
}

// Declare math atan2 for versions that have it instead of math.atan
declare namespace math {
    const atan2: typeof atan;
}
