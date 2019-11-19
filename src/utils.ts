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
