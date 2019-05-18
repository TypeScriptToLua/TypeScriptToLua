function __TS__ClassIndex(this: void, classTable: LuaClass, key: any): any {
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
