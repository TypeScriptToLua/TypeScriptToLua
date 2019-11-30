import * as path from "path";

export const normalizeSlashes = (filePath: string) => filePath.replace(/\\/g, "/");

export const trimExtension = (filePath: string) => filePath.slice(0, -path.extname(filePath).length);

export function formatPathToLuaPath(filePath: string): string {
    filePath = filePath.replace(/\.json$/, "");
    if (process.platform === "win32") {
        // Windows can use backslashes
        filePath = filePath.replace(/\.\\/g, "").replace(/\\/g, ".");
    }
    return filePath.replace(/\.\//g, "").replace(/\//g, ".");
}

export function flatMap<T, U>(array: readonly T[], callback: (value: T, index: number) => U | readonly U[]): U[] {
    const result: U[] = [];

    for (const [index, value] of array.entries()) {
        const mappedValue = callback(value, index);
        if (Array.isArray(mappedValue)) {
            result.push(...mappedValue);
        } else {
            result[result.length] = mappedValue as U;
        }
    }

    return result;
}
