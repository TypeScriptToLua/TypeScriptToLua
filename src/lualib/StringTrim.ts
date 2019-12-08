function __TS__StringTrim(this: string): string {
    // http://lua-users.org/wiki/StringTrim
    const [result] = string.gsub(this, "^%s*(.-)%s*$", "%1");
    return result;
}
