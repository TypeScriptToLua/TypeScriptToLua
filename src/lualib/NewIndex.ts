function __TS__NewIndex(this: void, classProto: LuaObject)
    : (this: void, tbl: LuaObject, key: any, val: any) => void
{
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
