import { __TS__NumberIsFinite } from "./NumberIsFinite";

/// https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.isinteger
export function __TS__NumberIsInteger(this: void, value: unknown): boolean {
    return __TS__NumberIsFinite(value) && math.floor(value as number) === (value as number);
}
