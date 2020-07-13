function __TS__StringCharCodeAt(this: string, index: number): number {
    if (index !== index) index = 0;
    if (index < 0) return NaN;
    return string.byte(this, index + 1) ?? NaN;
}
