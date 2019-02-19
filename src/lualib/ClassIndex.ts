interface LuaClass {
    ____super?: LuaClass;
    ____getters?: { [key: string]: (self: LuaClass) => any };
}

declare function rawget<T, K extends keyof T>(obj: T, key: K): T[K];

function __TS__ClassIndex(classTable: LuaClass, key: keyof LuaClass): any {
    while (true) {
        const getters = rawget(classTable, "____getters");
        if (getters) {
            const getter = getters[key];
            if (getter) {
                return getter(classTable);
            }
        }

        classTable = rawget(classTable, "____super");
        if (!classTable) {
            break;
        }

        const val = rawget(classTable, key);
        if (val !== null) {
            return val;
        }
    }
}
