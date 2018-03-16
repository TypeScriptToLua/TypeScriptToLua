import { Expect, Test, TestCase } from "alsatian";

import { CompilerOptions, parseCommandLine, ParsedCommandLine } from "../../src/CommandLineParser";


export class CLITests {

    @Test("defaultOption")
    @TestCase("luaTarget", "JIT")
    @TestCase("addHeader", false)
    @TestCase("dontRequireLuaLib", false)
    @TestCase("rootDir", process.cwd())
    @TestCase("outDir", process.cwd())
    public defaultOptions(option: string, expected: string) {
        let parsedCommandLine = parseCommandLine([]);

        Expect(parsedCommandLine.options[option]).toBe(expected);
    }

    @Test("InvalidLuaTarget")
    public invalidLuaTarget() {
        Expect(() => parseCommandLine(['--luaTarget', '42'])).toThrowError(Error, `Invalid values:
Argument: luaTarget, Given: "213123", Choices: "JIT", "5.3"`);
    }
}
