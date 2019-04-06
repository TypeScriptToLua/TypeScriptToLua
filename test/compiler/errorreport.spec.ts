import * as fs from "fs";
import * as path from "path";
import { runCli } from "./runner";

const srcFilePath = path.resolve(__dirname, "testfiles", "default_import.ts");
const outFilePath = path.resolve(__dirname, "testfiles", "default_import.lua");

afterEach(() => {
    try {
        fs.unlinkSync(outFilePath);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
});

test("Compile project", async () => {
    const { exitCode, output } = await runCli([
        srcFilePath,
        "--outDir",
        ".",
        "--rootDir",
        ".",
        "--types",
        "node",
    ]);

    expect(exitCode).toBe(2);
    expect(fs.existsSync(outFilePath)).toBe(true);
    expect(output).toContain("Cannot find module './default_export'.");
    expect(output).toContain(
        "Default Imports are not supported, please use named imports instead!",
    );
});
