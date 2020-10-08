function __TS__ParseFloat(this: void, numberString: string): number {
    // Check if string is infinity
    const infinityMatch = string.match(numberString, "^%s*(-?Infinity)");
    if (infinityMatch) {
        // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
        return infinityMatch[0] === "-" ? -Infinity : Infinity;
    }

    const number = tonumber(string.match(numberString, "^%s*(-?%d+%.?%d*)"));
    return number ?? NaN;
}
