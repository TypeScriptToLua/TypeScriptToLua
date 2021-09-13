// TODO: In the future, change this to __TS__RegisterFileInfo and provide tstl interface to
// get some metadata about transpilation.

interface SourceMap {
    [line: number]: number | { line: number; file: string };
}

declare function __TS__originalTraceback(this: void, thread?: LuaThread, message?: string, level?: number);

function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: SourceMap): void {
    globalThis.__TS__sourcemap = globalThis.__TS__sourcemap || {};
    globalThis.__TS__sourcemap[fileName] = sourceMap;

    if (globalThis.__TS__originalTraceback === undefined) {
        globalThis.__TS__originalTraceback = debug.traceback;
        debug.traceback = ((thread, message, level) => {
            let trace: string;
            if (thread === undefined && message === undefined && level === undefined) {
                trace = globalThis.__TS__originalTraceback();
            } else {
                trace = globalThis.__TS__originalTraceback(thread, message, level);
            }

            if (typeof trace !== "string") {
                return trace;
            }

            const replacer = (file: string, srcFile: string, line: string) => {
                const fileSourceMap: SourceMap = globalThis.__TS__sourcemap[file];
                if (fileSourceMap && fileSourceMap[line]) {
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
            [result] = string.gsub(result, '(%[string "[^"]+"%]):(%d+)', (file, line) =>
                replacer(file, "unknown", line)
            );

            return result;
        }) as typeof debug.traceback;
    }
}
