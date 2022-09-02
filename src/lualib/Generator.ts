import { __TS__CountVarargs } from "./CountVarargs";
import { GeneratorIterator } from "./GeneratorIterator";
import { __TS__Unpack } from "./Unpack";

function generatorIterator(this: GeneratorIterator) {
    return this;
}

function generatorNext(this: GeneratorIterator, ...args: any[]) {
    const co = this.____coroutine;
    if (coroutine.status(co) === "dead") return { done: true };

    const [status, value] = coroutine.resume(co, ...args);
    if (!status) throw value;

    return { value, done: coroutine.status(co) === "dead" };
}

export function __TS__Generator(this: void, fn: (this: void, ...args: any[]) => any) {
    return function (this: void, ...args: any[]): GeneratorIterator {
        const argsLength = __TS__CountVarargs(...args);
        return {
            // Using explicit this there, since we don't pass arguments after the first nil and context is likely to be nil
            ____coroutine: coroutine.create(() => fn(...__TS__Unpack(args, 1, argsLength))),
            [Symbol.iterator]: generatorIterator,
            next: generatorNext,
        };
    };
}
