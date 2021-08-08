/** @noSelfInFile */

interface LuaThread {
    readonly __internal__: unique symbol;
}

declare namespace coroutine {
    function create(f: (...args: any[]) => any): LuaThread;

    function resume(co: LuaThread, ...val: any[]): LuaMultiReturn<[true, ...any[]] | [false, string]>;

    function status(co: LuaThread): "running" | "suspended" | "normal" | "dead";

    function wrap(f: (...args: any[]) => any): /** @tupleReturn */ (...args: any[]) => any[];

    function yield(...args: any[]): LuaMultiReturn<any[]>;
}
