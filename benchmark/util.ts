import { BenchmarkFunction } from "./benchmark_types";

export function round(num: number, decimalPlaces: number = 0) {
    return tonumber(string.format(`%.${decimalPlaces}f`, num));
}

export const json: {
    decode: (this: void, str: string) => {};
    encode: (this: void, val: any) => string;
} = require("json");

export function readAll(file: LuaFile): string | undefined {
    let content: (string | undefined)[];
    if (_VERSION == "Lua 5.3") {
        // @ts-ignore
        content = file.read("a");
    } else {
        // JIT
        // @ts-ignore
        content = file.read("*a");
    }

    if (content && content[0]) {
        return content[0];
    }
}

export function readDir(dir = ""): string[] | undefined {
    let isWindows = false;
    let [success, findHandle] = pcall(() => io.popen(`find '${dir}' -maxdepth 1 -type f | sed "s|^\./||"`));

    if (!success) {
        [success, findHandle] = pcall(() => io.popen(`dir /A-D /B ${dir}`));
        isWindows = true;
    }

    if (success) {
        // appereantly TS can't infer this on it's own
        findHandle = findHandle as LuaFile;

        const findResult = readAll(findHandle);
        findHandle.close();

        if (findResult) {
            let files = findResult.split("\n");
            if (isWindows) {
                // on windows we need to append the directory path
                // on unix this is done by find automatically
                files = files.map(f => `${dir}/${f}`);
            }
            return findResult.split("\n").filter(p => p !== "");
        }
    }
}

export function loadBenchmarksFromDirectory(dir = ""): BenchmarkFunction[] {
    // Memory tests
    const benchmarkPaths = readDir(dir);

    if (!benchmarkPaths) {
        return [];
    }

    return benchmarkPaths.map(f => {
        // replace slashes with dots
        let dotPath = string.gsub(f, "%/", ".")[0];
        // remove extension
        dotPath = string.gsub(dotPath, ".lua", "")[0];
        return require(dotPath).default as BenchmarkFunction;
    });
}
