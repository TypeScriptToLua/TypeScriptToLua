function __TS__Iterator<T>(this: void, iterable: Iterable<T>): (this: void) => T {
    if (iterable[Symbol.iterator]) {
        const iterator = iterable[Symbol.iterator]();
        return () => {
            const result = iterator.next();
            if (!result.done) {
                return result.value;
            } else {
                return undefined;
            }
        };
    } else {
        let i = 0;
        return () => {
            i += 1;
            return iterable[i];
        };
    }
}
