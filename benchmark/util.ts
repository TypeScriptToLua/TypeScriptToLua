export function round(num: number, decimalPlaces: number = 0) {
    return tonumber(string.format(`%.${decimalPlaces}f`, num));
}

export const json: {
    decode: (this: void, str: string) => {};
    encode: (this: void, val: any) => string;
} = require("json");
