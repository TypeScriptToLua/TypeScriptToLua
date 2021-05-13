import * as path from "path";
import * as util from "../util";

const projectPath = path.resolve(__dirname, "module-resolution", "project-with-node-modules");

test("moduleResolution", () => {
    util.testProject(path.join(projectPath, "tsconfig.json"))
        .setMainFileName(path.join(projectPath, "main.ts"))
        .debug()
        .expectToEqual({});
})