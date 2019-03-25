declare const debug: {
    traceback: (this: void, ...args: any[]) => string;
};

declare const _G: {[key: string]: any} & {__originalTraceback: (this: void, ...args: any[]) => string};

// TODO: In the future, change this to __TS__RegisterFileInfo and provide tstl interface to
// get some metadata about transpilation.
function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: {[line: number]: number}): void {
    _G["__sourcemap"] = _G["__sourcemap"] || {};
    _G["__sourcemap"][fileName] = sourceMap;

    if (_G.__originalTraceback === undefined) {
        _G.__originalTraceback = debug.traceback;
        debug.traceback = (...args: any[]) => {
            const trace = _G["__originalTraceback"](...args);

            const [result, occurrences] = string.gsub(
                trace,
                "([^\\]+).lua:(%d+)",
                (file, line) => {
                    if (_G["__sourcemap"][file] && _G["__sourcemap"][file][line]) {
                        return `${file}.ts:${_G["__sourcemap"][file][line]}`;
                    }
                    return `${file}.lua:${line}`;
                }
            );

            return result;
        };
    }
}
