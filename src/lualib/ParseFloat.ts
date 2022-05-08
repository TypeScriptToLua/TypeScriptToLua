import { __TS__Match } from "./Match";

export function __TS__ParseFloat(this: void, numberString: string): number {
    // Check if string is infinity
    const [infinityMatch] = __TS__Match(numberString, "^%s*(-?Infinity)");
    if (infinityMatch) {
        // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
        return infinityMatch[0] === "-" ? -Infinity : Infinity;
    }

    const number = tonumber(__TS__Match(numberString, "^%s*(-?%d+%.?%d*)")[0]);
    return number ?? NaN;
}
