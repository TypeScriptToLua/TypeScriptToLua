/** @noSelfInFile */

declare const _VERSION: string;
declare function error(...args: any[]): never;

declare namespace debug {
    function traceback(...args: any[]): string;

    interface FunctionInfo<T extends Function = Function> {
        func: T;
        name?: string;
        namewhat: "global" | "local" | "method" | "field" | "";
        source: string;
        short_src: string;
        linedefined: number;
        lastlinedefined: number;
        what: "Lua" | "C" | "main";
        currentline: number;
        nups: number;
    }

    function getinfo(i: number, what?: string): Partial<FunctionInfo>;
}
