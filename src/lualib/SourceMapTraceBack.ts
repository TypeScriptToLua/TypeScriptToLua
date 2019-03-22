declare const debug: {
    traceback: (this: void, ...args: any[]) => string;
};

declare function getfenv(obj: any): {[key: string]: any};

function __TS__SourceMapTraceBack(fileName: string, sourceMap: {[line: number]: number}): void {
    getfenv(1)["traceback"] = getfenv(1)["traceback"] || {};
    getfenv(1)["traceback"][fileName] = getfenv(1)["traceback"][fileName] || debug.traceback;
    debug.traceback = (...args: any[]) => {
        let trace = getfenv(1)["traceback"][fileName](...args);

        const matches = string.gmatch(trace, `${fileName}.lua:(%d+)`);
        for (const match in matches) {
            trace = string.gsub(trace, `${fileName}.lua:${match}`, `${fileName}.ts:${sourceMap[match] || "??"}`);
        }

        return trace;
    };
}
