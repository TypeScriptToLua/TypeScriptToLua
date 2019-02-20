interface LuaClass {
    ____super?: LuaClass;
    ____setters?: { [key: string]: (self: LuaClass, val: any) => void };
}

declare function rawget<T, K extends keyof T>(obj: T, key: K): T[K];
declare function rawset<T, K extends keyof T>(obj: T, key: K, val: T[K]): void;

function __TS__ClassNewIndex(classTable: LuaClass, key: keyof LuaClass, val: any): void {
    let tbl = classTable;
    do {
        const setters = rawget(tbl, "____setters");
        if (setters) {
            const setter = setters[key];
            if (setter) {
                setter(tbl, val);
                return;
            }
        }

        tbl = rawget(tbl, "____super");
    }
    while (tbl);

    rawset(classTable, key, val);
}
