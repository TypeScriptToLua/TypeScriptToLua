// https://tc39.es/ecma262/#sec-array.prototype.with
export function __TS__ArrayWith<T>(this: T[], index: number, value: T): T[] {
    const len = this.length;

    // ToIntegerOrInfinity
    let relativeIndex = index;
    if (relativeIndex !== relativeIndex) {
        relativeIndex = 0;
    } else if (relativeIndex < 0) {
        relativeIndex = Math.ceil(relativeIndex);
    } else {
        relativeIndex = Math.floor(relativeIndex);
    }

    const actualIndex = relativeIndex < 0 ? len + relativeIndex : relativeIndex;
    if (actualIndex >= len || actualIndex < 0) {
        throw new RangeError("Invalid index : " + index);
    }

    const copy = [...this];
    copy[actualIndex] = value;
    return copy;
}
