import * as path from "path";
import { normalizeSlashes } from "../../src/utils";
import * as util from "../util";

test("should transpile", () => {
    const projectDir = path.join(__dirname, "project");
    const { transpiledFiles } = util
        .testProject(path.join(projectDir, "tsconfig.json"))
        .setMainFileName(path.join(projectDir, "index.ts"))
        .expectToHaveNoDiagnostics()
        .getLuaResult();

    expect(
        transpiledFiles.map(f => ({ filePath: path.relative(projectDir, f.outPath), lua: f.lua }))
    ).toMatchSnapshot();
});

test("should give verbose output", () => {
    // Capture console logs
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
        consoleLogs.push(args.map(a => a.toString().replace(normalizeSlashes(process.cwd()), "<cwd>")).join(","));
    };

    const projectDir = path.join(__dirname, "project");
    util.testProject(path.join(projectDir, "tsconfig.json"))
        .setMainFileName(path.join(projectDir, "index.ts"))
        .setOptions({ tstlVerbose: true })
        .expectToHaveNoDiagnostics();

    console.log = originalLog;

    expect(consoleLogs).toMatchSnapshot();
});
