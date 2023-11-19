/// https://www.ecma-international.org/ecma-262/10.0/index.html#sec-number.prototype.tofixed
export function __TS__NumberToFixed(this: number, fractionDigits?: number): string {
    if (Math.abs(this) >= 1e21 || this !== this) {
        return this.toString();
    }
    const f = Math.floor(fractionDigits ?? 0);
    // reduced to 99 as string.format only supports 2-digit numbers
    if (f < 0 || f > 99) {
        throw "toFixed() digits argument must be between 0 and 99";
    }
    // throws "invalid format (width or precision too long)" if strlen > 99
    // if (f < 80) return fmt; else try {return fmt} catch(_) { throw "toFixed() digits argument..." }
    return string.format(`%.${f}f`, this);
}
