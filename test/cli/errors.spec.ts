import * as fs from "fs";
import { resolveFixture, runCli } from "./run";

const srcFilePath = resolveFixture("errors/error.ts");
const outFilePath = resolveFixture("errors/error.lua");
const errorMessage = "Unable to convert function with no 'this' parameter to function with 'this'.";

afterEach(() => {
    if (fs.existsSync(outFilePath)) fs.unlinkSync(outFilePath);
});

test("should report errors", async () => {
    const { exitCode, output } = await runCli([srcFilePath]);

    expect(output).toContain(errorMessage);
    expect(exitCode).toBe(2);
    expect(fs.existsSync(outFilePath)).toBe(true);
});

test("shouldn't emit files with --noEmitOnError", async () => {
    const { exitCode, output } = await runCli(["--noEmitOnError", srcFilePath]);

    expect(output).toContain(errorMessage);
    expect(exitCode).toBe(1);
    expect(fs.existsSync(outFilePath)).toBe(false);
});
