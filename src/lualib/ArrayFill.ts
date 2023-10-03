// https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.fill
export function __TS__ArrayFill<T>(this: T[], value: T, start?: number, end?: number): T[] {
    let relativeStart = start ?? 0;
    let relativeEnd = end ?? this.length;

    if (relativeStart < 0) {
        relativeStart += this.length;
    }

    if (relativeEnd < 0) {
        relativeEnd += this.length;
    }

    for (let i = relativeStart; i < relativeEnd; i++) {
        this[i] = value;
    }

    return this;
}
