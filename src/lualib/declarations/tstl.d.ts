/** @noSelfInFile */

/** @vararg */
interface Vararg<T> extends Array<T> {}

/** @forRange */
declare function forRange(start: number, limit: number, step?: number): number[];

interface LuaClass {
    prototype: LuaObject;
    ____super?: LuaClass;
    ____getters?: { [key: string]: (self: LuaClass) => any };
    ____setters?: { [key: string]: (self: LuaClass, val: any) => void };
    __index?: any;
}

interface LuaObject {
    constructor: LuaClass;
    ____getters?: { [key: string]: (self: LuaObject) => any };
    ____setters?: { [key: string]: (self: LuaObject, val: any) => void };
    __index?: any;
}
