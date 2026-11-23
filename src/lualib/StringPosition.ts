// Turns a JS string position into an integer Lua's string functions accept: NaN counts as 0, fractions are
// truncated like JS ToIntegerOrInfinity, and values are clamped to [-length, length] (Infinity included)
export function __TS__StringPosition(this: void, position: number, length: number): number {
    if (position !== position) return 0;
    if (position >= length) return length;
    if (position <= -length) return -length;
    return position >= 0 ? math.floor(position) : math.ceil(position);
}
