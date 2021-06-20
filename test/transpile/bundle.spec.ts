import * as path from "path";
import * as util from "../util";

const projectDir = path.join(__dirname, "bundle");
const inputProject = path.join(projectDir, "tsconfig.json");

test("should transpile into one file", () => {
    const { diagnostics, transpiledFiles } = util.testProject(inputProject).getLuaResult();

    expect(diagnostics).not.toHaveDiagnostics();
    expect(transpiledFiles).toHaveLength(1);

    const { outPath, lua } = transpiledFiles[0];
    // Verify the name is as specified in tsconfig
    expect(outPath.endsWith(path.join("bundle", "bundle.lua"))).toBe(true);
    // Verify exported module by executing
    // Use an empty TS string because we already transpiled the TS project
    util.testModule("").setLuaHeader(lua!).expectToEqual({ myNumber: 3 });
});
