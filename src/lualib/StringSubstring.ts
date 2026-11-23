import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringSubstring(this: string, start: number, end?: number): string {
    start = __TS__StringPosition(start, this.length);
    if (end !== undefined) end = __TS__StringPosition(end, this.length);

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
