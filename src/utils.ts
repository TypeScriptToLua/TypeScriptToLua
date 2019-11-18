import * as path from "path";

export const normalizeSlashes = (filePath: string) => filePath.replace(/\\/g, "/");

export const trimExt = (filePath: string) => filePath.slice(0, -path.extname(filePath).length);

export const formatPathToLuaPath = (filePath: string) => {
    filePath = filePath.replace(/\.json$/, "");
    if (process.platform === "win32") {
        // Windows can use backslashes
        filePath = filePath.replace(/\.\\/g, "").replace(/\\/g, ".");
    }
    return filePath.replace(/\.\//g, "").replace(/\//g, ".");
};
