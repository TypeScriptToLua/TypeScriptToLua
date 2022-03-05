import { GeneratorIterator } from "./GeneratorIterator";

function iteratorGeneratorStep(this: GeneratorIterator): LuaMultiReturn<[true, any] | []> {
    const co = this.____coroutine;

    const [status, value] = coroutine.resume(co);
    if (!status) throw value;

    if (coroutine.status(co) === "dead") return $multi();
    return $multi(true, value);
}

function iteratorIteratorStep<T>(this: Iterator<T>): LuaMultiReturn<[true, T] | []> {
    const result = this.next();
    if (result.done) return $multi();
    return $multi(true, result.value);
}

function iteratorStringStep(this: string, index: number): LuaMultiReturn<[number, string] | []> {
    index += 1;
    if (index > this.length) return $multi();
    return $multi(index, string.sub(this, index, index));
}

export function __TS__Iterator<T>(
    this: void,
    iterable: string | GeneratorIterator | Iterable<T> | readonly T[]
): LuaMultiReturn<[(...args: any[]) => [any, any] | [], ...any[]]> | LuaIterable<LuaMultiReturn<[number, T]>> {
    if (typeof iterable === "string") {
        return $multi(iteratorStringStep, iterable, 0);
    } else if ("____coroutine" in iterable) {
        return $multi(iteratorGeneratorStep, iterable);
    } else if (iterable[Symbol.iterator]) {
        const iterator = iterable[Symbol.iterator]();
        return $multi(iteratorIteratorStep, iterator);
    } else {
        return ipairs(iterable as readonly T[]);
    }
}
