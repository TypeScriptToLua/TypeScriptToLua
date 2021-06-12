// https://262.ecma-international.org/10.0/#sec-array.prototype.entries
function __TS__ArrayEntries<T>(this: void, array: T[]): IterableIterator<[number, T]> {
    let key = 0;
    return {
        [Symbol.iterator](): IterableIterator<[number, T]> {
            return this;
        },
        next(): IteratorResult<[number, T]> {
            const result = { done: array[key] === undefined, value: [key, array[key]] as [number, T] };
            key++;
            return result;
        },
    };
}
