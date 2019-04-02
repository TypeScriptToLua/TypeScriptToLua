function __TS__StringReplace(this: void, source: string, searchValue: string, replaceValue: string): string {
    return string.gsub(source, searchValue, replaceValue)[0];
}
