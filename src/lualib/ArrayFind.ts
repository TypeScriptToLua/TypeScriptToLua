// https://www.ecma-international.org/ecma-262/10.0/index.html#sec-array.prototype.find
export function __TS__ArrayFind<T>(
    this: T[],
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: any
): T | undefined {
    for (const i of $range(1, this.length)) {
        const elem = this[i - 1];
        if (predicate.call(thisArg, elem, i - 1, this)) {
            return elem;
        }
    }

    return undefined;
}
