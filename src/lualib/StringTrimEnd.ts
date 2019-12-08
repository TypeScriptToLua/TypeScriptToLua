function __TS__StringTrimEnd(this: string): string {
    // http://lua-users.org/wiki/StringTrim
    const [result] = string.gsub(this, "%s*$", "");
    return result;
}
