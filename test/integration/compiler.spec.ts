import { Expect, Teardown, Test, TestCase } from "alsatian";
import * as fs from "fs-extra";
import * as path from "path";
import { execCommandLine } from "../../src/Compiler";

export class CompilerTests {

    @TestCase('tsconfig.default.json', ['typescript_lualib.lua', 'nested/folder/file.lua'])
    @TestCase('tsconfig.outDir.json', ['outDir/typescript_lualib.lua', 'outDir/nested/folder/file.lua'])
    @TestCase('tsconfig.rootDir.json', ['nested/typescript_lualib.lua', 'nested/folder/file.lua'])
    @TestCase('tsconfig.bothDirOptions.json', ['outDir/typescript_lualib.lua', 'outDir/folder/file.lua'])
    @Test("Compile options: outDir and rootDir")
    public compileProject(tsconfig: string, expectedFiles: string[]) {
        const compilerPath = path.resolve('dist/Compiler.js');
        const tsconfigPath = path.resolve('test/integration/project', tsconfig);

        // Compile project
        execCommandLine(['-p', tsconfigPath]);

        expectedFiles.forEach(relativePath => {
            const absolutePath = path.resolve('test/integration/project', relativePath);

            // Assert
            Expect(fs.existsSync(absolutePath)).toBe(true);

            // Delete file
            fs.unlink(absolutePath, (error) => {
                throw error;
            });
        });
    }

    @Teardown
    public teardown() {
        // Delete outDir folder
        fs.removeSync('test/integration/project/outDir');
    }

}
