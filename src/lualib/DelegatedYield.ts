function __TS__DelegatedYield<T>(this: void, iterable: string | GeneratorIterator | Iterable<T> | readonly T[]) {
    if (typeof iterable === "string") {
        for (const index of forRange(0, iterable.length - 1)) {
            coroutine.yield(iterable[index]);
        }
    } else if ("____coroutine" in iterable) {
        const co = iterable.____coroutine;
        while (true) {
            const [status, value] = coroutine.resume(co);
            if (!status) throw value;
            if (coroutine.status(co) === "dead") {
                return value;
            } else {
                coroutine.yield(value);
            }
        }
    } else if (iterable[Symbol.iterator]) {
        const iterator = iterable[Symbol.iterator]();
        while (true) {
            const result = iterator.next();
            if (result.done) {
                return result.value;
            } else {
                coroutine.yield(result.value);
            }
        }
    } else {
        for (const value of iterable as readonly T[]) {
            coroutine.yield(value);
        }
    }
}
