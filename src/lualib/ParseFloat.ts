import { __TS__Match } from "./Match";

export function __TS__ParseFloat(this: void, numberString: string): number {
    // Check if string is infinity
    const [infinityMatch] = __TS__Match(numberString, "^%s*(-?Infinity)");
    if (infinityMatch !== undefined) {
        // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
        return infinityMatch[0] === "-" ? -Infinity : Infinity;
    }

    // Try with scientific notation first, fall back to basic decimal
    const [numberMatch] = __TS__Match(numberString, "^%s*(-?%d+%.?%d*[eE][+-]?%d+)");
    const number = tonumber(numberMatch ?? __TS__Match(numberString, "^%s*(-?%d+%.?%d*)")[0]);
    return number ?? NaN;
}
