import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringSubstr(this: string, from: number, length?: number): string {
    from = __TS__StringPosition(from, this.length);

    // A negative start counts from the end, and is clamped to the start of the string
    if (from < 0) from = math.max(this.length + from, 0);

    if (length !== undefined) {
        length = __TS__StringPosition(length, this.length);
        if (length <= 0) return "";
        length += from;
    }

    return string.sub(this, from + 1, length);
}
