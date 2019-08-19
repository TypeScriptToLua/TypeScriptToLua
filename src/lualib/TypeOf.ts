function __TS__TypeOf(this: void, value: unknown): string {
    const luaType = type(value);
    if (luaType === "table") {
        return "object";
    } else if (luaType === "nil") {
        return "undefined";
    } else {
        return luaType;
    }
}
