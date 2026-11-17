import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringSlice(this: string, start?: number, end?: number): string {
    start = start === undefined ? 0 : __TS__StringPosition(start, this.length);
    if (end !== undefined) end = __TS__StringPosition(end, this.length);

    if (start >= 0) start += 1;
    if (end !== undefined && end < 0) end -= 1;

    return string.sub(this, start, end);
}
