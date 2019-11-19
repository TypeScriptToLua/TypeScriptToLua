import * as path from "path";
import { transpileProject } from "../../src";
import { executeLua } from "../util";

const inputProject = path.join(__dirname, "bundle/tsconfig.json");

test("should transpile into one file", () => {
    const transpileResult = transpileProject(inputProject);

    expect(transpileResult.diagnostics).not.toHaveErrorDiagnostics();
    expect(transpileResult.emitResult.length).toBe(1);

    const { name, text } = transpileResult.emitResult[0];
    expect(name).toBe("bundle.lua");
    expect(executeLua(text)).toBe({ myNumber: 3 });
});
