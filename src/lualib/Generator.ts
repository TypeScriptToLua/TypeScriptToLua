interface GeneratorIterator {
    ____coroutine: LuaThread;
    [Symbol.iterator](): GeneratorIterator;
    next: typeof __TS__GeneratorNext;
}

function __TS__GeneratorIterator(this: GeneratorIterator) {
    return this;
}

function __TS__GeneratorNext(this: GeneratorIterator, ...args: Vararg<any[]>) {
    const co = this.____coroutine;
    if (coroutine.status(co) === "dead") return { done: true };

    const [status, value] = coroutine.resume(co, ...args);
    if (!status) throw value;

    return { value, done: coroutine.status(co) === "dead" };
}

function __TS__Generator(this: void, fn: (this: void, ...args: any[]) => any) {
    return function (this: void, ...args: Vararg<any[]>): GeneratorIterator {
        const argsLength = select("#", ...args);
        return {
            // Using explicit this there, since we don't pass arguments after the first nil and context is likely to be nil
            ____coroutine: coroutine.create(() => fn((unpack || table.unpack)(args, 1, argsLength))),
            [Symbol.iterator]: __TS__GeneratorIterator,
            next: __TS__GeneratorNext,
        };
    };
}
