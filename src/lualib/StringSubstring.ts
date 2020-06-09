function __TS__StringSubstring(this: string, start: number, end?: number): string {
    if (end !== end) end = 0;

    if (end !== undefined && start > end) {
        [start, end] = [end, start];
    }

    if (start >= 0) {
        start += 1;
    } else {
        start = 1;
    }

    if (end !== undefined && end < 0) end = 0;

    return string.sub(this, start, end);
}
