/** @tupleReturn */
function __TS__IteratorGeneratorStep(this: GeneratorIterator): [true, any] | [] {
    const co = this.____coroutine;

    const [status, value] = coroutine.resume(co);
    if (!status) throw value;

    if (coroutine.status(co) === "dead") return [];
    return [true, value];
}

/** @tupleReturn */
function __TS__IteratorIteratorStep<T>(this: Iterator<T>): [true, T] | [] {
    const result = this.next();
    if (result.done) return [];
    return [true, result.value];
}

/** @tupleReturn */
function __TS__Iterator<T>(
    this: void,
    iterable: Iterable<T> | GeneratorIterator | readonly T[]
): [(...args: any[]) => [any, T] | [], ...any[]] {
    if ("____coroutine" in iterable) {
        return [__TS__IteratorGeneratorStep, iterable];
    } else if (iterable[Symbol.iterator]) {
        const iterator = iterable[Symbol.iterator]();
        return [__TS__IteratorIteratorStep, iterator];
    } else {
        return ipairs(iterable as readonly T[]);
    }
}
