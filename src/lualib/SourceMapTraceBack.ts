// TODO: In the future, change this to __TS__RegisterFileInfo and provide tstl interface to
// get some metadata about transpilation.

interface SourceMap {
    [line: number]: number | { line: number; file: string };
}

declare function __TS__originalTraceback(this: void, thread?: LuaThread, message?: string, level?: number);

export function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: SourceMap): void {
    globalThis.__TS__sourcemap = globalThis.__TS__sourcemap || {};
    globalThis.__TS__sourcemap[fileName] = sourceMap;

    if (globalThis.__TS__originalTraceback === undefined) {
        const originalTraceback = debug.traceback;
        globalThis.__TS__originalTraceback = originalTraceback;
        debug.traceback = ((thread, message, level) => {
            let trace: string;
            if (thread === undefined && message === undefined && level === undefined) {
                trace = originalTraceback();
            } else {
                trace = originalTraceback(thread, message, level);
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

            const stringReplacer = (file: string, line: string) => {
                const fileSourceMap: SourceMap = globalThis.__TS__sourcemap[file];
                if (fileSourceMap && fileSourceMap[line]) {
                    const chunkName = string.match(file, '%[string "([^"]+)"%]')[0];
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
