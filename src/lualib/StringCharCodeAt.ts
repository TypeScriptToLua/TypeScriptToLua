import { __TS__StringPosition } from "./StringPosition";

export function __TS__StringCharCodeAt(this: string, index: number): number {
    index = __TS__StringPosition(index, this.length);
    if (index < 0) return NaN;
    return string.byte(this, index + 1) ?? NaN;
}
