import * as path from "path";
import { transpileProjectResult } from "./run";

test("should transpile", () => {
    const { diagnostics, emittedFiles } = transpileProjectResult(path.join(__dirname, "project", "tsconfig.json"));
    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toMatchSnapshot();
});
