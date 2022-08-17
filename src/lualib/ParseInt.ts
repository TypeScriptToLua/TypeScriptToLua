import { __TS__Match } from "./Match";

const parseIntBasePattern = "0123456789aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTvVwWxXyYzZ";

export function __TS__ParseInt(this: void, numberString: string, base?: number): number {
    // Check which base to use if none specified
    if (base === undefined) {
        base = 10;
        const [hexMatch] = __TS__Match(numberString, "^%s*-?0[xX]");
        if (hexMatch) {
            base = 16;
            numberString = __TS__Match(hexMatch, "-")[0]
                ? "-" + numberString.substr(hexMatch.length)
                : numberString.substr(hexMatch.length);
        }
    }

    // Check if base is in bounds
    if (base < 2 || base > 36) {
        return NaN;
    }

    // Calculate string match pattern to use
    const allowedDigits =
        base <= 10 ? parseIntBasePattern.substring(0, base) : parseIntBasePattern.substr(0, 10 + 2 * (base - 10));
    const pattern = `^%s*(-?[${allowedDigits}]*)`;

    // Try to parse with Lua tonumber
    const number = tonumber(__TS__Match(numberString, pattern)[0], base);

    if (number === undefined) {
        return NaN;
    }

    // Lua uses a different floor convention for negative numbers than JS
    if (number >= 0) {
        return math.floor(number);
    } else {
        return math.ceil(number);
    }
}
