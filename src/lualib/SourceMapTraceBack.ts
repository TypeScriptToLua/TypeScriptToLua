declare const debug: {
    traceback: (this: void, ...args: any[]) => string;
};

type FileTracebackTable = {[filename: string]: (this: void, ...args: any[]) => string};
declare const _G: {[key: string]: any} & {["traceback"]: FileTracebackTable};

declare function print(this: void, ...messages: any[]): void;

function __TS__SourceMapTraceBack(this: void, fileName: string, sourceMap: {[line: number]: number}): void {
    _G["traceback"] = _G["traceback"] || {};
    _G["traceback"][fileName] = _G["traceback"][fileName] || debug.traceback;

    debug.traceback = (...args: any[]) => {
        let trace = _G["traceback"][fileName](...args);

        const matches = string.gmatch(trace, `${fileName}.lua:(%d+)`);
        for (const match of matches) {
            if (match in sourceMap) {
                const [result, _] = string.gsub(
                    trace,
                    `${fileName}.lua:${match}`,
                    `${fileName}.ts:${sourceMap[match] || "??"}`
                );
                trace = result;
            }
        }

        return trace;
    };
}
