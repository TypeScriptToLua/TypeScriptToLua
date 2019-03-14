import { Expect, FocusTest, Test, TestCase } from "alsatian";

import * as util from "../src/util";
import * as path from "path";
import { CompilerOptions } from "../../src/CompilerOptions";

export class RequireTests {

    @TestCase("file.ts", "./folder/Module", "folder.Module", { rootDir: "." }, false)
    @TestCase("file.ts", "./folder/Module", "folder.Module", { rootDir: "./" }, false)
    @TestCase("src/file.ts", "./folder/Module", "src.folder.Module", { rootDir: "." }, false)
    @TestCase("file.ts", "folder/Module", "folder.Module", { rootDir: ".", baseUrl: "." }, false)
    @TestCase("file.ts", "folder/Module", "folder.Module", { rootDir: "./", baseUrl: "." }, false)
    @TestCase("src/file.ts", "./folder/Module", "folder.Module", { rootDir: "src" }, false)
    @TestCase("src/file.ts", "./folder/Module", "folder.Module", { rootDir: "./src" }, false)
    @TestCase("file.ts", "../Module", "", { rootDir: "./src" }, true)
    @TestCase("src/dir/file.ts", "../Module", "Module", { rootDir: "./src" }, false)
    @TestCase("src/dir/dir/file.ts", "../../dir/Module", "dir.Module", { rootDir: "./src" }, false)
    @Test("require paths root from --baseUrl or --rootDir")
    public testRequirePath(
        filePath: string,
        usedPath: string,
        expectedPath: string,
        options: CompilerOptions,
        throwsError: boolean): void {
        if (throwsError) {
            Expect(() => util.transpileString(`import * from "${usedPath}";`, options, true, filePath)).toThrow();
        } else {
            const lua = util.transpileString(`import * from "${usedPath}";`, options, true, filePath);
            const regex = /require\("(.*?)"\)/;
            const match = regex.exec(lua);
            Expect(match[1]).toBe(expectedPath);
        }
    }

    @TestCase("", "src.fake")
    @TestCase("/** @noResolution */", "fake")
    @Test("noResolution on ambient modules causes no path alterations")
    public testRequireModule(comment: string, expectedPath: string): void {
        const lua = util.transpileString({
            "src/file.ts": `import * as fake from "fake";`,
            "module.d.ts": `${comment} declare module "fake" {}`,
        }, undefined, true, "src/file.ts");
        const regex = /require\("(.*?)"\)/;
        Expect(regex.exec(lua)[1]).toBe(expectedPath);
    }

}