import * as path from "path";
import * as util from "../util";
import { transpileProject } from "../../src";

const inputProject = path.join(__dirname, "bundle/tsconfig.json");

test("should transpile into one file", () => {
    const transpileResult = transpileProject(inputProject);

    expect(transpileResult.diagnostics).not.toHaveErrorDiagnostics();
    expect(transpileResult.emitResult.length).toBe(1);

    const { name, text } = transpileResult.emitResult[0];
    // Verify the name is as specified in tsconfig
    expect(name).toBe("bundle.lua");
    // Verify exported module by executing
    expect(util.executeLuaModule(text)).toEqual({ myNumber: 3 });
});
