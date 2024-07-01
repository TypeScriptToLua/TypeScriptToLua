// https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.sign

import { __TS__NumberIsNaN } from "./NumberIsNaN";

export function __TS__MathSign(this: void, val: number) {
    if (__TS__NumberIsNaN(val) || val === 0) {
        return val;
    }

    if (val < 0) {
        return -1;
    }

    return 1;
}
