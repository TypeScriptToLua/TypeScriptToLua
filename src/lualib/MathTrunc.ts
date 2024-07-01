// https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.trunc

import { __TS__NumberIsFinite } from "./NumberIsFinite";
export function __TS__MathTrunc(this: void, val: number) {
    if (!__TS__NumberIsFinite(val) || val === 0) {
        return val;
    }

    return val > 0 ? math.floor(val) : math.ceil(val);
}
