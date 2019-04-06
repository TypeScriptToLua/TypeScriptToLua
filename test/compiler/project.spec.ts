import * as fs from "fs";
import * as path from "path";
import { runCli } from "./runner";

/**
 * Find all files inside a dir, recursively.
 */
function getAllFiles(dir: string): string[] {
    return fs.readdirSync(dir).reduce((files, file) => {
        const name = path.join(dir, file);
        const isDirectory = fs.statSync(name).isDirectory();
        return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
    }, []);
}

let existingFiles: string[];
let filesAfterCompile: string[];

afterEach(() => {
    // Remove files that were created by the test
    const createdFiles = filesAfterCompile.filter(v => existingFiles.indexOf(v) < 0);
    for (const file of createdFiles) {
        fs.unlinkSync(file);
    }
    existingFiles = [];
    filesAfterCompile = [];
});

test.each([
    {
        projectName: "basic",
        tsconfig: "tsconfig.json",
        expectedFiles: ["lualib_bundle.lua", "test_src/test_lib/file.lua", "test_src/main.lua"],
    },
    {
        projectName: "basic",
        tsconfig: ".",
        expectedFiles: ["lualib_bundle.lua", "test_src/test_lib/file.lua", "test_src/main.lua"],
    },
    {
        projectName: "basic",
        tsconfig: "test_src/main.ts",
        expectedFiles: ["lualib_bundle.lua", "test_src/test_lib/file.lua", "test_src/main.lua"],
    },
    {
        projectName: "basic",
        tsconfig: "tsconfig.outDir.json",
        expectedFiles: [
            "out_dir/lualib_bundle.lua",
            "out_dir/test_src/test_lib/file.lua",
            "out_dir/test_src/main.lua",
        ],
    },
    {
        projectName: "basic",
        tsconfig: "tsconfig.rootDir.json",
        expectedFiles: [
            "test_src/lualib_bundle.lua",
            "test_src/test_lib/file.lua",
            "test_src/main.lua",
        ],
    },
    {
        projectName: "basic",
        tsconfig: "tsconfig.bothDirOptions.json",
        expectedFiles: [
            "out_dir/lualib_bundle.lua",
            "out_dir/test_lib/file.lua",
            "out_dir/main.lua",
        ],
    },
    {
        projectName: "baseurl",
        tsconfig: "tsconfig.json",
        expectedFiles: [
            "out_dir/lualib_bundle.lua",
            "out_dir/test_src/test_lib/nested/lib_file.lua",
            "out_dir/test_src/main.lua",
        ],
    },
])("Compile project (%p)", async ({ projectName, tsconfig, expectedFiles }) => {
    const relPathToProject = path.join("projects", projectName);

    // Setup we cant do this in beforeEach because we need the projectname
    existingFiles = getAllFiles(path.resolve(__dirname, relPathToProject));
    filesAfterCompile = [];

    const tsconfigPath = path.resolve(__dirname, relPathToProject, tsconfig);

    const { exitCode, output } = await runCli(["-p", tsconfigPath]);

    expect(output).not.toContain("error TS");
    expect(exitCode).toBe(0);

    filesAfterCompile = getAllFiles(path.resolve(__dirname, relPathToProject));
    expectedFiles = expectedFiles.map(relPath =>
        path.resolve(__dirname, relPathToProject, relPath),
    );
    expectedFiles.push(...existingFiles);

    for (const existingFile of filesAfterCompile) {
        expect(expectedFiles).toContain(existingFile);
    }
});
