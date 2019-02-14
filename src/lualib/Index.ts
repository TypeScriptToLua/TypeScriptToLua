interface LuaClass {
    prototype: LuaObject;
    ____super?: LuaClass;
}

declare interface LuaObject {
    constructor: LuaClass;
    ____getters?: { [key: string]: (self: LuaObject) => any };
}

declare function rawget<T, K extends keyof T>(obj: T, key: K): T[K];

function __TS__Index(classProto: LuaObject): (tbl: LuaObject, key: keyof LuaObject) => any {
    return (tbl, key) => {
        let proto = classProto;
        while (true) {
            const val = rawget(proto, key);
            if (val !== null) {
                return val;
            }

            const getters = rawget(proto, "____getters");
            if (getters) {
                const getter = getters[key];
                if (getter) {
                    return getter(tbl);
                }
            }

            const base = rawget(rawget(proto, "constructor"), "____super");
            if (!base) {
                break;
            }

            proto = rawget(base, "prototype");
        }
    };
}
