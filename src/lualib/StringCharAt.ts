import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringCharAt(this: string, pos: number): string {
    pos = __TS__StringPosition(pos, this.length);
    if (pos < 0) return "";
    return string.sub(this, pos + 1, pos + 1);
}
