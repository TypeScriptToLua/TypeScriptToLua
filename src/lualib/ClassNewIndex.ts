function __TS__ClassNewIndex(this: void, classTable: LuaClass, key: any, val: any): void {
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
