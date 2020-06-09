function __TS__StringCharAt(this: string, pos: number): string {
    if (pos !== pos) pos = 0;
    if (pos < 0) return "";
    return string.sub(this, pos + 1, pos + 1);
}
