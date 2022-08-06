import * as util from "../util";
import * as path from "path";

test("should transpile all projects with --build", () => {
    const solutionDir = path.join(__dirname, "project-references", "project-references");
    const projectDir= path.join(solutionDir, "project1");
    const { transpiledFiles } = util
        .testProject(path.join(solutionDir, "tsconfig.json"))
        .setMainFileName(path.join(projectDir, "index.ts"))
        .setOptions({ build: true })
        .expectToHaveNoDiagnostics()
        .getLuaResult();

    console.log(transpiledFiles);
});
