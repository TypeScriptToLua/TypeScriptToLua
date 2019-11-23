import * as path from "path";
import { transpileProject } from "../../src";

const projectDir = path.join(__dirname, "basic");
const inputProject = path.join(projectDir, "tsconfig.json");

test("should transpile", () => {
    const transpileResult = transpileProject(inputProject);

    expect(transpileResult.diagnostics).not.toHaveErrorDiagnostics();
    expect(transpileResult.emitResult).toMatchSnapshot();
});
