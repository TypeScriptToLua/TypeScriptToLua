function __TS__StringTrim(this: string): string {
    // http://lua-users.org/wiki/StringTrim
    const [result] = string.gsub(this, "^[%s\xA0\u{FEFF}]*(.-)[%s\xA0\u{FEFF}]*$", "%1");
    return result;
}
