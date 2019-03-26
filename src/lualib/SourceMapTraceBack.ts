declare const debug: {
    traceback: (this: void, ...args: any[]) => string;
};

type TraceBackFunction = (this: void, thread?: any, message?: string, level?: number) => string;

declare const _G: {[key: string]: any} & {__TS__originalTraceback: TraceBackFunction};

// TODO: In the future, change this to __TS__RegisterFileInfo and provide tstl interface to
// get some metadata about transpilation.
function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: {[line: number]: number}): void {
    _G["__TS__sourcemap"] = _G["__TS__sourcemap"] || {};
    _G["__TS__sourcemap"][fileName] = sourceMap;

    if (_G.__originalTraceback === undefined) {
        _G.__originalTraceback = debug.traceback;
        debug.traceback = (thread, message, level) => {
            const trace = _G["__TS__originalTraceback"](thread, message, level);

            const [result, occurrences] = string.gsub(
                trace,
                "([^\\]+).lua:(%d+)",
                (file, line) => {
                    if (_G["__TS__sourcemap"][file] && _G["__TS__sourcemap"][file][line]) {
                        return `${file}.ts:${_G["__TS__sourcemap"][file][line]}`;
                    }
                    return `${file}.lua:${line}`;
                }
            );

            return result;
        };
    }
}
