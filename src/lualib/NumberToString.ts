const ____radixChars = "0123456789abcdefghijklmnopqrstuvwxyz";

// https://www.ecma-international.org/ecma-262/10.0/index.html#sec-number.prototype.tostring
function __TS__NumberToString(this: number, radix?: number): string {
    if (radix === undefined || radix === 10 || this === Infinity || this === -Infinity || this !== this) {
        return this.toString();
    }

    radix = Math.floor(radix);
    if (radix < 2 || radix > 36) {
        throw "toString() radix argument must be between 2 and 36";
    }

    let [integer, fraction] = math.modf(Math.abs(this));

    let result = "";
    if (radix === 8) {
        result = string.format("%o", integer);
    } else if (radix === 16) {
        result = string.format("%x", integer);
    } else {
        do {
            result = ____radixChars[integer % radix] + result;
            integer = Math.floor(integer / radix);
        } while (integer !== 0);
    }

    // https://github.com/v8/v8/blob/f78e8d43c224847fa56b3220a90be250fc0f0d6e/src/numbers/conversions.cc#L1221
    if (fraction !== 0) {
        result += ".";
        let delta = 1e-16;
        do {
            fraction *= radix;
            delta *= radix;
            const digit = Math.floor(fraction);
            result += ____radixChars[digit];
            fraction -= digit;
            // TODO: Round to even
        } while (fraction >= delta);
    }

    if (this < 0) {
        result = "-" + result;
    }

    return result;
}
