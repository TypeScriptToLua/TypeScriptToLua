function __TS__IteratorGeneratorStep(this: GeneratorIterator): LuaMultiReturn<[true, any] | []> {
    const co = this.____coroutine;

    const [status, value] = coroutine.resume(co);
    if (!status) throw value;

    if (coroutine.status(co) === "dead") return $multi();
    return $multi(true, value);
}

function __TS__IteratorIteratorStep<T>(this: Iterator<T>): LuaMultiReturn<[true, T] | []> {
    const result = this.next();
    if (result.done) return $multi();
    return $multi(true, result.value);
}

function __TS__IteratorStringStep(this: string, index: number): LuaMultiReturn<[number, string] | []> {
    index += 1;
    if (index > this.length) return $multi();
    return $multi(index, string.sub(this, index, index));
}

function __TS__Iterator<T>(
    this: void,
    iterable: string | GeneratorIterator | Iterable<T> | readonly T[]
): LuaMultiReturn<[(...args: any[]) => [any, any] | [], ...any[]]> | LuaIterable<LuaMultiReturn<[number, T]>> {
    if (typeof iterable === "string") {
        return $multi(__TS__IteratorStringStep, iterable, 0);
    } else if ("____coroutine" in iterable) {
        return $multi(__TS__IteratorGeneratorStep, iterable);
    } else if (iterable[Symbol.iterator]) {
        const iterator = iterable[Symbol.iterator]();
        return $multi(__TS__IteratorIteratorStep, iterator);
    } else {
        return ipairs(iterable as readonly T[]);
    }
}
