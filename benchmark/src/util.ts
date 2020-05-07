import { BenchmarkFunction } from "./benchmark_types";

export type Result<T, E> = Ok<T, E> | Err<T, E>;

export class Ok<T, E> {
    constructor(readonly value: T) {}

    public isOk(): this is Ok<T, E> {
        return true;
    }

    public isError(): this is Err<T, E> {
        return false;
    }
}

export class Err<T, E> {
    constructor(readonly error: E) {}

    public isOk(): this is Ok<T, E> {
        return false;
    }

    public isError(): this is Err<T, E> {
        return true;
    }
}

export const ok = <T, E>(value: T): Ok<T, E> => new Ok(value);

export const err = <T, E>(err: E): Err<T, E> => new Err(err);

export function toFixed(num: number, decimalPlaces = 0): string {
    return string.format(`%.${decimalPlaces}f`, num);
}

// @ts-ignore
export const isWindows = package.config.sub(1, 1) === "\\";

export const json: {
    decode: (this: void, str: string) => {};
    encode: (this: void, val: any) => string;
} = require("json");

export function readFile(path: string): Result<string, string> {
    const fileOpenArray = io.open(path, "rb");

    if (fileOpenArray && fileOpenArray[0]) {
        const fileHandle = fileOpenArray[0];
        const readAllResult = readAll(fileHandle);
        fileHandle.close();

        return readAllResult;
    }
    return err(`Can't open file ${path}`);
}

export function readAll(file: LuaFile): Result<string, string> {
    const content = file.read(_VERSION === "Lua 5.3" ? "a" : ("*a" as any)) as [string | undefined];

    if (content[0]) {
        return ok(content[0]);
    }
    return err(`Can't readAll for file ${file}`);
}

export function readDir(dir: string): Result<string[], string> {
    const findHandle = isWindows ? io.popen(`dir /A-D /B ${dir}`) : io.popen(`find '${dir}' -maxdepth 1 -type f`);
    const findReadAllResult = readAll(findHandle);

    if (!findHandle.close()) {
        return err(`readDir popen failed for dir ${dir} see stdout for more information.`);
    }

    if (findReadAllResult.isOk()) {
        let files = findReadAllResult.value.split("\n");
        if (isWindows) {
            // on windows we need to append the directory path
            // on unix this is done by find automatically
            files = files.map(f => `${dir}/${f}`);
        } else {
            // strip leading "./" on unix
            files = files.map(f => (f[0] === "." && f[1] === "/" ? f.substr(2) : f));
        }
        return ok(files.filter(p => p !== ""));
    } else {
        return err(findReadAllResult.error);
    }
}

export function loadBenchmarksFromDirectory(benchmarkDir: string): Result<BenchmarkFunction[], string> {
    const readBenchmarkDirResult = readDir(benchmarkDir);

    if (readBenchmarkDirResult.isError()) {
        return err(readBenchmarkDirResult.error);
    }

    return ok(
        readBenchmarkDirResult.value.map(f => {
            // replace slashes with dots
            let dotPath = string.gsub(f, "%/", ".")[0];
            // remove extension
            dotPath = string.gsub(dotPath, ".lua", "")[0];
            return require(dotPath).default as BenchmarkFunction;
        })
    );
}
