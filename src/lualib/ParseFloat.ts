import { __TS__Match } from "./Match";

export function __TS__ParseFloat(this: void, numberString: string): number {
    // Check if string is infinity
    const [infinityMatch] = __TS__Match(numberString, "^%s*([+-]?Infinity)");
    if (infinityMatch !== undefined) {
        // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
        return infinityMatch[0] === "-" ? -Infinity : Infinity;
    }

    const [sign, mantissa, exponent] = __TS__Match(numberString, "^%s*([+-]?)(%d*%.?%d*)([eE]?[+-]?%d*)");
    // The mantissa needs at least one digit, e.g. "." and "-.e1" are not numbers
    if (mantissa === undefined || __TS__Match(mantissa, "%d")[0] === undefined) {
        return NaN;
    }

    // An exponent without digits (e.g. "1e" or "1e+") is ignored, like in JS
    const exponentPart = __TS__Match(exponent, "^[eE][+-]?%d+$")[0] !== undefined ? exponent : "";
    const number = tonumber((sign === "-" ? "-" : "") + mantissa + exponentPart);
    return number ?? NaN;
}
