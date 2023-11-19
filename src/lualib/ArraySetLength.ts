export function __TS__ArraySetLength<T>(this: T[], length: number): number {
    if (
        length < 0 ||
        length !== length || // NaN
        length === Infinity || // Infinity
        Math.floor(length) !== length
    ) {
        // non-integer
        throw `invalid array length: ${length}`;
    }
    for (const i of $range(length + 1, this.length)) {
        this[i - 1] = undefined!;
    }
    return length;
}
