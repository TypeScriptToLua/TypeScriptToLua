function __TS__StringSlice(this: string, start?: number, end?: number): string {
    if (start === undefined || start !== start) start = 0;
    if (end !== end) end = 0;

    if (start >= 0) start += 1;
    if (end !== undefined && end < 0) end -= 1;

    return string.sub(this, start, end);
}
