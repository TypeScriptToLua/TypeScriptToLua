/** @noSelfInFile */

interface LuaThread {
    readonly __internal__: unique symbol;
}

declare namespace coroutine {
    function create(f: (...args: any[]) => any): LuaThread;

    /** @tupleReturn */
    function resume(co: LuaThread, ...val: any[]): [true, ...any[]] | [false, string];

    function status(co: LuaThread): "running" | "suspended" | "normal" | "dead";

    function wrap(f: (...args: any[]) => any): /** @tupleReturn */ (...args: any[]) => any[];

    /** @tupleReturn */
    function yield(...args: any[]): any[];
}
