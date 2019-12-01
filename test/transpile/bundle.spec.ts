import * as path from "path";
import * as util from "../util";
import { transpileProject } from "../../src";

const projectDir = path.join(__dirname, "bundle");
const inputProject = path.join(projectDir, "tsconfig.json");

test("should transpile into one file", () => {
    const transpileResult = transpileProject(inputProject);

    expect(transpileResult.diagnostics).not.toHaveDiagnostics();
    expect(transpileResult.emitResult.length).toBe(1);

    const { name, text } = transpileResult.emitResult[0];
    // Verify the name is as specified in tsconfig
    expect(name).toBe(path.join(projectDir, "bundle.lua").replace(/\\/g, "/"));
    // Verify exported module by executing
    expect(util.executeLuaModule(text)).toEqual({ myNumber: 3 });
});
