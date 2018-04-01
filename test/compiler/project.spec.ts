import { Expect, Setup, Teardown, Test, TestCase } from "alsatian";
import * as fs from "fs";
import * as path from "path";
import { execCommandLine } from "../../src/Compiler";

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

    @Setup
    public setup() {
      this.existingFiles = getAllFiles(path.resolve(__dirname, "./project"));
      this.filesAfterCompile = [];
    }

    @TestCase("tsconfig.json",
              "typescript_lualib.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase(".",
              "typescript_lualib.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("test_src/main.ts",
              "typescript_lualib.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("tsconfig.outDir.json",
              "out_dir/typescript_lualib.lua",
              "out_dir/test_src/test_lib/file.lua",
              "out_dir/test_src/main.lua")
    @TestCase("tsconfig.rootDir.json",
              "test_src/typescript_lualib.lua",
              "test_src/test_lib/file.lua",
              "test_src/main.lua")
    @TestCase("tsconfig.bothDirOptions.json",
              "out_dir/typescript_lualib.lua",
              "out_dir/test_lib/file.lua",
              "out_dir/main.lua")
    @Test("Compile project")
    public compileProject(tsconfig: string, ...expectedFiles: string[]) {
        const tsconfigPath = path.resolve(__dirname, "project", tsconfig);

        // Compile project
        execCommandLine(["-p", tsconfigPath]);

        this.filesAfterCompile = getAllFiles(path.resolve(__dirname, "project"));
        expectedFiles = expectedFiles.map((relPath) => path.resolve(__dirname, "project", relPath));
        expectedFiles.push(...this.existingFiles);

        for (const existingFile of this.filesAfterCompile) {
            Expect(expectedFiles).toContain(existingFile);
        }
    }

    @Teardown
    public teardown() {
        // Remove files taht were created by the test
        const createdFiles = this.filesAfterCompile.filter((v) => this.existingFiles.indexOf(v) < 0);
        for (const file of createdFiles) {
            fs.unlinkSync(file);
        }
        this.existingFiles = [];
        this.filesAfterCompile = [];
    }

}
