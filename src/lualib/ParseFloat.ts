function __TS__ParseFloat(this: void, numberString: string): number {
    const number = tonumber(string.match(numberString, "^-?%d+%.?%d*"));
    return number ?? NaN;
}
