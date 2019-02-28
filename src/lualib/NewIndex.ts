interface LuaClass {
    prototype: LuaObject;
    ____super?: LuaClass;
}

declare interface LuaObject {
    constructor: LuaClass;
    ____setters?: { [key: string]: (self: LuaObject, val: any) => void };
}

declare function rawget<T, K extends keyof T>(obj: T, key: K): T[K];
declare function rawset<T, K extends keyof T>(obj: T, key: K, val: T[K]): void;

function __TS__NewIndex(classProto: LuaObject): (tbl: LuaObject, key: keyof LuaObject, val: any) => void {
    return (tbl, key, val) => {
        let proto = classProto;
        while (true) {
            const setters = rawget(proto, "____setters");
            if (setters) {
                const setter = setters[key];
                if (setter) {
                    setter(tbl, val);
                    return;
                }
            }

            const base = rawget(rawget(proto, "constructor"), "____super");
            if (!base) {
                break;
            }

            proto = rawget(base, "prototype");
        }

        rawset(tbl, key, val);
    };
}
