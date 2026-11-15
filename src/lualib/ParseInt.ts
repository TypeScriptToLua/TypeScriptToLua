import { __TS__Match } from "./Match";

const parseIntBasePattern = "0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ";

export function __TS__ParseInt(this: void, numberString: string, base?: number): number {
    let [sign, digits] = __TS__Match(numberString, "^%s*([+-]?)(.*)");
    if (digits === undefined) {
        return NaN;
    }

    // Radix 0 or undefined means 10, unless the string has a hex prefix.
    // With radix 16 the hex prefix is also allowed.
    if (base === undefined || base === 0) {
        base = 10;
        if (__TS__Match(digits, "^0[xX]")[0] !== undefined) {
            base = 16;
            digits = digits.substring(2);
        }
    } else if (base === 16 && __TS__Match(digits, "^0[xX]")[0] !== undefined) {
        digits = digits.substring(2);
    }

    // Check if base is in bounds
    if (base < 2 || base > 36) {
        return NaN;
    }

    // Calculate string match pattern to use
    const allowedDigits =
        base <= 10 ? parseIntBasePattern.substring(0, base) : parseIntBasePattern.substring(0, 10 + 2 * (base - 10));
    const pattern = `^([${allowedDigits}]*)`;

    // Try to parse with Lua tonumber
    const number = tonumber(__TS__Match(digits, pattern)[0], base);

    if (number === undefined) {
        return NaN;
    }

    // Lua uses a different floor convention for negative numbers than JS
    const result = math.floor(number);
    return sign === "-" ? -result : result;
}
