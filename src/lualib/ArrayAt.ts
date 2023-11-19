// https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.at
// Technically the specs also allow non-numeric types to be passed as index.
// However, TypeScript types the `Array.at` index param as number so we also expect only numbers
// This behaviour also matches the implementation of other Array functions in lualib.
export function __TS__ArrayAt<T>(this: T[], relativeIndex: number): T | undefined {
    const absoluteIndex = relativeIndex < 0 ? this.length + relativeIndex : relativeIndex;

    if (absoluteIndex >= 0 && absoluteIndex < this.length) {
        return this[absoluteIndex];
    }

    return undefined;
}
