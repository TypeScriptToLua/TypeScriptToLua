import { Expect, FocusTest, Test, TestCase } from "alsatian";

import * as util from "../src/util";
import { parseCommandLine } from "../../src/CommandLineParser";
import { CompilerOptions } from "../../src/CompilerOptions";

export class RequireTests {

    @TestCase("./folder/Module", "folder.Module")
    @TestCase("./Module", "Module")
    @TestCase(".\\\\folder\\\\Module", "folder.Module")
    @TestCase("./folder/Module", "folder.Module", { rootDir: "src" })
    @TestCase("./folder/Module", "folder.Module", { rootDir: "./src" })
    @TestCase("./folder/Module", "folder.Module", { rootDir: ".\\\\src" })
    @Test("require paths resolve the same way they are created")
    public testRequirePath(usedPath: string, expectedPath: string, options?: CompilerOptions) {
        // This regex extracts `hello` from require("hello")
        const regex = /require\("(.*?)"\)/;
        const lua = util.transpileString(`import * from "${usedPath}";`, options);
        const match = regex.exec(lua);
        Expect(match[1]).toBe(expectedPath);
    }

}