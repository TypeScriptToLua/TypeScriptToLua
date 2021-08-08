function __TS__ArrayJoin(this: unknown[], separator = ",") {
    let result = "";
    for (const [index, value] of ipairs(this)) {
        if (index > 1) result += separator;
        result += value.toString();
    }
    return result;
}
