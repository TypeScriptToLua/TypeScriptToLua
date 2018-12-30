function __TS__Iterator<T>(iterable: Iterable<T>): () => T {
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
