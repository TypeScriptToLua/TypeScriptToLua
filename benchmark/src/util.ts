import { BenchmarkFunction } from "./benchmark_types";

type Result<T> = { success: true; value: T } | { success: false; error: string };

export function toFixed(num: number, decimalPlaces = 0): string {
    return string.format(`%.${decimalPlaces}f`, num);
}

export function calculatePercentageChange(oldValue: number, newValue: number): number {
    return (newValue / oldValue) * 100 - 100;
}

// @ts-ignore
export const isWindows = package.config.sub(1, 1) === "\\";

export const json: {
    decode: (this: void, str: string) => {};
    encode: (this: void, val: any) => string;
} = require("json");

export function readFile(path: string): Result<string> {
    const fileOpenArray = io.open(path, "rb");

    if (fileOpenArray && fileOpenArray[0]) {
        const fileHandle = fileOpenArray[0];
        const readAllResult = readAll(fileHandle);
        fileHandle.close();

        return readAllResult;
    }
    return { success: false, error: `Can't open file ${path}` };
}

export function readAll(file: LuaFile): Result<string> {
    const content = file.read(_VERSION === "Lua 5.3" ? "a" : ("*a" as any)) as [string | undefined];

    if (content[0]) {
        return { success: true, value: content[0] };
    }
    return { success: false, error: `Can't readAll for file ${file}` };
}

export function readDir(dir: string): Result<string[]> {
    const findHandle = isWindows ? io.popen(`dir /A-D /B ${dir}`) : io.popen(`find '${dir}' -maxdepth 1 -type f`);
    const findReadAllResult = readAll(findHandle);

    if (!findHandle.close()) {
        return { success: false, error: `readDir popen failed for dir ${dir} see stdout for more information.` };
    }

    if (findReadAllResult.success) {
        let files = findReadAllResult.value.split("\n");
        if (isWindows) {
            // on windows we need to append the directory path
            // on unix this is done by find automatically
            files = files.map(f => `${dir}/${f}`);
        } else {
            // strip leading "./" on unix
            files = files.map(f => (f[0] === "." && f[1] === "/" ? f.substr(2) : f));
        }
        return { success: true, value: files.filter(p => p !== "") };
    } else {
        return { success: false, error: findReadAllResult.error };
    }
}

export function loadBenchmarksFromDirectory(benchmarkDir: string): Result<BenchmarkFunction[]> {
    const readBenchmarkDirResult = readDir(benchmarkDir);

    if (!readBenchmarkDirResult.success) {
        return { success: false, error: readBenchmarkDirResult.error };
    }

    return {
        success: true,
        value: readBenchmarkDirResult.value.map(f => {
            // replace slashes with dots
            let dotPath = string.gsub(f, "%/", ".")[0];
            // remove extension
            dotPath = string.gsub(dotPath, ".lua", "")[0];
            return require(dotPath).default as BenchmarkFunction;
        }),
    };
}
