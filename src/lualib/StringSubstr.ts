function __TS__StringSubstr(this: string, from: number, length?: number): string {
    if (from !== from) from = 0;

    if (length !== undefined) {
        if (length !== length || length <= 0) return "";
        length += from;
    }

    if (from >= 0) from += 1;

    return string.sub(this, from, length);
}
