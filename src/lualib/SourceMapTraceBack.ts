// TODO: In the future, change this to __TS__RegisterFileInfo and provide tstl interface to
// get some metadata about transpilation.

import { __TS__Match } from "./Match";

interface SourceMap {
    [line: string]: number | { line: number; file: string };
}

declare global {
    function __TS__originalTraceback(this: void, thread?: LuaThread, message?: string, level?: number): void;
    // eslint-disable-next-line no-var
    var __TS__sourcemap: Record<string, SourceMap>;
}

export function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: SourceMap): void {
    globalThis.__TS__sourcemap = globalThis.__TS__sourcemap || {};
    globalThis.__TS__sourcemap[fileName] = sourceMap;

    if (globalThis.__TS__originalTraceback === undefined) {
        const originalTraceback = debug.traceback;
        globalThis.__TS__originalTraceback = originalTraceback as typeof __TS__originalTraceback;
        debug.traceback = ((thread?: LuaThread, message?: string, level?: number) => {
            let trace: string;
            if (thread === undefined && message === undefined && level === undefined) {
                trace = originalTraceback();
            } else if (_VERSION.includes("Lua 5.0")) {
                trace = originalTraceback(`[Level ${level}] ${message}`);
            } else {
                // @ts-ignore Fails when compiled with Lua 5.0 types
                trace = originalTraceback(thread, message, level);
            }

            if (typeof trace !== "string") {
                return trace;
            }

            const replacer = (file: string, srcFile: string, line: string) => {
                const fileSourceMap: SourceMap = globalThis.__TS__sourcemap[file];
                if (fileSourceMap !== undefined && fileSourceMap[line] !== undefined) {
                    const data = fileSourceMap[line];
                    if (typeof data === "number") {
                        return `${srcFile}:${data}`;
                    }

                    return `${data.file}:${data.line}`;
                }

                return `${file}:${line}`;
            };

            let [result] = string.gsub(trace, "(%S+)%.lua:(%d+)", (file, line) =>
                replacer(`${file}.lua`, `${file}.ts`, line)
            );

            const stringReplacer = (file: string, line: string) => {
                const fileSourceMap: SourceMap = globalThis.__TS__sourcemap[file];
                if (fileSourceMap !== undefined && fileSourceMap[line] !== undefined) {
                    const chunkName = __TS__Match(file, '%[string "([^"]+)"%]')[0];
                    const [sourceName] = string.gsub(chunkName, ".lua$", ".ts");
                    const data = fileSourceMap[line];
                    if (typeof data === "number") {
                        return `${sourceName}:${data}`;
                    }

                    return `${data.file}:${data.line}`;
                }

                return `${file}:${line}`;
            };
            [result] = string.gsub(result, '(%[string "[^"]+"%]):(%d+)', (file, line) => stringReplacer(file, line));

            return result;
        }) as typeof debug.traceback;
    }
}
