import * as fs from "fs";
import * as path from "path";
import { runCli } from "./runner";

const outFileRelPath = "./testfiles/out_file.script";
const outFileAbsPath = path.join(__dirname, outFileRelPath);

afterEach(() => {
    try {
        fs.unlinkSync(outFileAbsPath);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
});

test("Outfile absoulte path", async () => {
    const { exitCode } = await runCli([
        "--types",
        "node",
        "--skipLibCheck",
        "--outFile",
        outFileAbsPath,
        path.join(__dirname, "./testfiles/out_file.ts"),
    ]);

    expect(exitCode).toBe(0);
    expect(fs.existsSync(outFileAbsPath)).toBe(true);
});

test("Outfile relative path", async () => {
    const { exitCode, output } = await runCli([
        "--types",
        "node",
        "--skipLibCheck",
        "--outDir",
        __dirname,
        "--outFile",
        outFileRelPath,
        path.join(__dirname, "./testfiles/out_file.ts"),
    ]);

    expect(output).not.toContain("error TS");
    expect(exitCode).toBe(0);
    expect(fs.existsSync(outFileAbsPath)).toBe(true);
});
