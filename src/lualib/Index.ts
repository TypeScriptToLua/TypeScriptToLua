function __TS__Index(this: void, classProto: LuaObject): (this: void, tbl: LuaObject, key: any) => any {
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
