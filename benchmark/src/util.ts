import { BenchmarkFunction } from "./benchmark_types";

export function toFixed(num: number, decimalPlaces = 0): string {
    return string.format(`%.${decimalPlaces}f`, num);
}

export function calculatePercentageChange(oldValue: number, newValue: number): number {
    return (newValue / oldValue) * 100 - 100;
}

// @ts-ignore
export const isWindows = package.config.startsWith("\\");

export const json: {
    decode: (this: void, str: string) => {};
    encode: (this: void, val: any) => string;
} = require("json");

export function readFile(path: string): string {
    const [fileHandle] = io.open(path, "rb");

    if (!fileHandle) {
        throw Error(`Can't open file ${path}`);
    }

    const fileContent = readAll(fileHandle);
    fileHandle.close();

    return fileContent;
}

export function readAll(file: LuaFile): string {
    const content = file.read(_VERSION === "Lua 5.3" ? "a" : ("*a" as any)) as [string | undefined];

    if (content[0]) {
        return content[0];
    }
    throw Error(`Can't readAll for file ${file}`);
}

export function readDir(dir: string): string[] {
    const findHandle = io.popen(isWindows ? `dir /A-D /B ${dir}` : `find '${dir}' -maxdepth 1 -type f`);
    const findResult = readAll(findHandle);

    if (!findHandle.close()) {
        throw Error(`readDir popen failed for dir ${dir} see stdout for more information.`);
    }

    let files = findResult.split("\n");
    if (isWindows) {
        // on windows we need to append the directory path
        // on unix this is done by find automatically
        files = files.map(f => `${dir}/${f}`);
    } else {
        // strip leading "./" on unix
        files = files.map(f => (f.startsWith(".") && f[1] === "/" ? f.substr(2) : f));
    }
    return files.filter(p => p !== "");
}

export function loadBenchmarksFromDirectory(benchmarkDir: string): BenchmarkFunction[] {
    const benchmarkFiles = readDir(benchmarkDir);

    return benchmarkFiles.map(f => {
        // replace slashes with dots
        let dotPath = string.gsub(f, "%/", ".")[0];
        // remove extension
        dotPath = string.gsub(dotPath, ".lua", "")[0];
        return require(dotPath).default as BenchmarkFunction;
    });
}
