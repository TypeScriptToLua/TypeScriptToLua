import { __TS__CountVarargs } from "./CountVarargs";

// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-array.prototype.reduce
export function __TS__ArrayReduceRight<TElement, TAccumulator>(
    this: TElement[],
    callbackFn: (accumulator: TAccumulator, currentValue: TElement, index: number, array: TElement[]) => TAccumulator,
    ...initial: TAccumulator[]
): TAccumulator {
    const len = this.length;

    let k = len - 1;
    let accumulator: TAccumulator = undefined!;

    // Check if initial value is present in function call
    if (__TS__CountVarargs(...initial) !== 0) {
        [accumulator] = [...initial];
    } else if (len > 0) {
        accumulator = this[k] as unknown as TAccumulator;
        k -= 1;
    } else {
        throw "Reduce of empty array with no initial value";
    }

    for (const i of $range(k + 1, 1, -1)) {
        accumulator = callbackFn(accumulator, this[i - 1], i - 1, this);
    }

    return accumulator;
}
