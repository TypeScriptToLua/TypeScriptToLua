import * as fs from "fs";
import * as path from "path";
import { compile } from "../../src/Compiler";

let outFileRelPath: string;
let outFileAbsPath: string;

beforeAll(() => {
    outFileRelPath = "./testfiles/out_file.script";
    outFileAbsPath = path.join(__dirname, outFileRelPath);
});

afterEach(() => {
    fs.unlink(outFileAbsPath, err => {
        if (err) {
            throw err;
        }
    });
});

test("Outfile absoulte path", () => {
    compile([
        "--types",
        "node",
        "--outFile",
        outFileAbsPath,
        path.join(__dirname, "./testfiles/out_file.ts"),
    ]);

    expect(fs.existsSync(outFileAbsPath)).toBe(true);
});

test("Outfile relative path", () => {
    compile([
        "--types",
        "node",
        "--outDir",
        __dirname,
        "--outFile",
        outFileRelPath,
        path.join(__dirname, "./testfiles/out_file.ts"),
    ]);

    expect(fs.existsSync(outFileAbsPath)).toBe(true);
});
