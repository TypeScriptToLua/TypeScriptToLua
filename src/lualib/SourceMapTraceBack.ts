// TODO: In the future, change this to __TS__RegisterFileInfo and provide tstl interface to
// get some metadata about transpilation.
function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: {[line: number]: number}): void {
    _G["__TS__sourcemap"] = _G["__TS__sourcemap"] || {};
    _G["__TS__sourcemap"][fileName] = sourceMap;

    if (_G.__TS__originalTraceback === undefined) {
        _G.__TS__originalTraceback = debug.traceback;
        debug.traceback = (thread, message, level) => {
            const trace = _G["__TS__originalTraceback"](thread, message, level);
            const [result] = string.gsub(
                trace,
                "(%S+).lua:(%d+)",
                (file, line) => {
                    if (_G["__TS__sourcemap"][file + ".lua"] && _G["__TS__sourcemap"][file + ".lua"][line]) {
                        return `${file}.ts:${_G["__TS__sourcemap"][file + ".lua"][line]}`;
                    }
                    return `${file}.lua:${line}`;
                }
            );

            return result;
        };
    }
}
