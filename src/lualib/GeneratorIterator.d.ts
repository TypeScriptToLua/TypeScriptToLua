export interface GeneratorIterator {
    ____coroutine: LuaThread;
    [Symbol.iterator](): GeneratorIterator;
    next: typeof generatorNext;
}
