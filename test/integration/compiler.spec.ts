import { Expect, Teardown, Test, TestCase } from "alsatian";
import { execSync } from "child_process"
import { existsSync, removeSync, unlink } from "fs-extra"
import { resolve } from "path"

export class CompilerTests {

    @TestCase('tsconfig.default.json', ['typescript_lualib.lua', 'nested/folder/file.lua'])
    @TestCase('tsconfig.outDir.json', ['outDir/typescript_lualib.lua', 'outDir/nested/folder/file.lua'])
    @TestCase('tsconfig.rootDir.json', ['nested/typescript_lualib.lua', 'nested/folder/file.lua'])
    @TestCase('tsconfig.bothDirOptions.json', ['outDir/typescript_lualib.lua', 'outDir/folder/file.lua'])
    @Test("Compile project")
    public compileProject(tsconfig: string, expectedFiles: string[]) {
        const compilerPath = resolve('dist/Compiler.js');
        const tsconfigPath = resolve('test/integration/project', tsconfig);

        // Compile project
        execSync(`node ${compilerPath} -p ${tsconfigPath}`);

        expectedFiles.forEach(relativePath => {
            const absolutePath = resolve('test/integration/project', relativePath);

            // Assert
            Expect(existsSync(absolutePath)).toBe(true);

            // Delete file
            unlink(absolutePath, (error) => {
                throw error;
            });
        });
    }

    @Teardown
    public teardown() {
        // Delete outDir folder
        removeSync('test/integration/project/outDir');
    }

}
