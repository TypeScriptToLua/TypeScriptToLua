import { resolveFixture, transpileProjectResult } from "./run";

test("should transpile", () => {
    const { diagnostics, emittedFiles } = transpileProjectResult(resolveFixture("project/tsconfig.json"));
    expect(diagnostics).not.toHaveDiagnostics();
    expect(emittedFiles).toMatchSnapshot();
});
