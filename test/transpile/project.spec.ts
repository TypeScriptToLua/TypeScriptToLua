import * as path from "path";
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
