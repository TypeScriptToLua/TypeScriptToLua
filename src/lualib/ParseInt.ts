const __TS__parseInt_patterns = {
    2: "^-?[01]*",
    3: "^-?[012]*",
    4: "^-?[0123]*",
    5: "^-?[01234]*",
    6: "^-?[012345]*",
    7: "^-?[0123456]*",
    8: "^-?[01234567]*",
    9: "^-?[012345678]*",
    10: "^-?[0123456789]*",
    11: "^-?[0123456789aA]*",
    12: "^-?[0123456789aAbB]*",
    13: "^-?[0123456789aAbBcC]*",
    14: "^-?[0123456789aAbBcCdD]*",
    15: "^-?[0123456789aAbBcCdDeE]*",
    16: "^-?[0123456789aAbBcCdDeEfF]*",
};

function __TS__ParseInt(this: void, numberString: string, base?: number): number {
    const number = tonumber(string.match(numberString, __TS__parseInt_patterns[base ?? 10]), base);

    if (number === undefined) {
        return NaN;
    }

    if (number >= 0) {
        return math.floor(number);
    } else {
        return math.ceil(number);
    }
}
