function __TS__Iterator<T>(this: void, iterable: Iterable<T>): (this: void) => T {
    const iterator = iterable[Symbol.iterator]();
    return () => {
        const result = iterator.next();
        if (!result.done) {
            return result.value;
        } else {
            return undefined;
        }
    };
}
