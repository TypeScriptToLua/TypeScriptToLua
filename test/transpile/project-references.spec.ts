import * as path from "path";
import * as tstl from "../../src";

test("should transpile all projects with --build", () => {
    const solutionDir = path.join(__dirname, "project-references", "project-references");
    const projectDir= path.join(solutionDir, "mainproject");

    const { diagnostics } = tstl.transpileProject(path.join(projectDir, "tsconfig.json"), {build: true});

    expect(diagnostics).toHaveLength(0);
    // expect(transpiledFiles.some(f => f.outPath === path.join(solutionDir, "dist", "main.lua"))).toBe(true);
});
