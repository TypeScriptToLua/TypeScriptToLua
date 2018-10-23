import { Expect, Setup, Teardown, Test, TestCase } from "alsatian";
import * as fs from "fs";
import * as path from "path";
import { compile } from "../../src/Compiler";

/**
 * Find all files inside a dir, recursively.
 */
function getAllFiles(dir: string): string[] {
    return fs.readdirSync(dir).reduce(
        (files, file) => {
            const name = path.join(dir, file);
            const isDirectory = fs.statSync(name).isDirectory();
            return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
        },
        []
    );
}

export class CompilerProjectTests {

    private existingFiles: string[];
    private filesAfterCompile: string[];

    @TestCase("basic",
              "tsconfig.json",
              "lualib_bundle.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("basic",
              ".",
              "lualib_bundle.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("basic",
              "test_src/main.ts",
              "lualib_bundle.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("basic",
              "tsconfig.outDir.json",
              "out_dir/lualib_bundle.lua",
              "out_dir/test_src/test_lib/file.lua",
              "out_dir/test_src/main.lua")
    @TestCase("basic",
              "tsconfig.rootDir.json",
              "test_src/lualib_bundle.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("basic",
              "tsconfig.bothDirOptions.json",
              "out_dir/lualib_bundle.lua",
              "out_dir/test_lib/file.lua",
              "out_dir/main.lua")
    @TestCase("baseurl",
              "tsconfig.json",
              "out_dir/lualib_bundle.lua",
              "out_dir/test_src/test_lib/nested/lib_file.lua",
              "out_dir/test_src/main.lua")
    @Test("Compile project")
    public compileProject(projectName: string, tsconfig: string, ...expectedFiles: string[]) {
        const relPathToProject = path.join("projects", projectName);

        // Setup we cant do this in @setup because we need the projectname
        this.existingFiles = getAllFiles(path.resolve(__dirname, relPathToProject));
        this.filesAfterCompile = [];
        // Setup End

        const tsconfigPath = path.resolve(__dirname, relPathToProject, tsconfig);

        // Compile project
        compile(["-p", tsconfigPath]);

        this.filesAfterCompile = getAllFiles(path.resolve(__dirname, relPathToProject));
        expectedFiles = expectedFiles.map(relPath => path.resolve(__dirname, relPathToProject, relPath));
        expectedFiles.push(...this.existingFiles);

        for (const existingFile of this.filesAfterCompile) {
            Expect(expectedFiles).toContain(existingFile);
        }
    }

    @Teardown
    public teardown() {
        // Remove files that were created by the test
        const createdFiles = this.filesAfterCompile.filter(v => this.existingFiles.indexOf(v) < 0);
        for (const file of createdFiles) {
            fs.unlinkSync(file);
        }
        this.existingFiles = [];
        this.filesAfterCompile = [];
    }

}
