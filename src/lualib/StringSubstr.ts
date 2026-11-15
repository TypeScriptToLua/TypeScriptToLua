export function __TS__StringSubstr(this: string, from: number, length?: number): string {
    if (from !== from) from = 0;

    // A negative start counts from the end, and is clamped to the start of the string
    if (from < 0) from = math.max(this.length + from, 0);

    if (length !== undefined) {
        if (length !== length || length <= 0) return "";
        length += from;
    }

    return string.sub(this, from + 1, length);
}
