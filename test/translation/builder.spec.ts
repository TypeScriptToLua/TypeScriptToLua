import { Expect, Test, TestCases } from "alsatian";

import * as util from "../src/util";

import * as fs from "fs";
import * as path from "path";

const files: string[][] = [];
const fileContents: {[key: string]: Buffer} = {};

const tsPath = path.join(__dirname, "./ts/");
const luaPath = path.join(__dirname, "./lua/");

const tsFiles = fs.readdirSync(tsPath);
const luaFiles = fs.readdirSync(luaPath);

tsFiles.forEach(
    (tsFile, i) => {
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
        files.push([tsFile, luaFile]);
        fileContents[tsFile] = fs.readFileSync(tsFileAbsolute);
        fileContents[luaFile] = fs.readFileSync(luaFileAbsolute);
    }
);

function BufferToTestString(b: Buffer): string {
    return b.toString().trim().split("\r\n").join("\n");
}

export class FileTests {

    @TestCases(files)
    @Test("Transformation Tests")
    public transformationTests(tsFile: string, luaFile: string) {
        Expect(util.transpileString(BufferToTestString(fileContents[tsFile])))
        .toEqual(BufferToTestString(fileContents[luaFile]));
    }

}
