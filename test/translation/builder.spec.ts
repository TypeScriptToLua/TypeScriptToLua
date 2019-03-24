import * as fs from "fs";
import * as path from "path";
import * as util from "../util";

const files: Array<{ ts: string; lua: string }> = [];
const fileContents: { [key: string]: Buffer } = {};

const tsPath = path.join(__dirname, "./ts/");
const luaPath = path.join(__dirname, "./lua/");

const tsFiles = fs.readdirSync(tsPath);
const luaFiles = fs.readdirSync(luaPath);

tsFiles.forEach((tsFile, i) => {
    // ignore non ts files
    if (path.extname(tsFile) !== ".ts") {
        return;
    }
    const luaPart = luaFiles.indexOf(tsFile.replace(".ts", ".lua"));
    if (luaPart === -1) {
        throw new Error("Missing lua counter part for test file: " + tsFile);
    }
    const luaFile = luaFiles[luaPart];
    const luaFileAbsolute = path.join(luaPath, luaFile);
    const tsFileAbsolute = path.join(tsPath, tsFile);
    files.push({ ts: tsFile, lua: luaFile });
    fileContents[tsFile] = fs.readFileSync(tsFileAbsolute);
    fileContents[luaFile] = fs.readFileSync(luaFileAbsolute);
});

function BufferToTestString(b: Buffer): string {
    return b
        .toString()
        .trim()
        .split("\r\n")
        .join("\n");
}

test.each(files)("Transformation Tests (%p)", ({ ts, lua }) => {
    expect(util.transpileString(BufferToTestString(fileContents[ts]))).toEqual(
        BufferToTestString(fileContents[lua]),
    );
});
