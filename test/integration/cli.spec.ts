import { Expect, Test, TestCase, FocusTest } from "alsatian";

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
        // Don't check error message because the yargs library messes the message up.
        Expect(() => parseCommandLine(['--luaTarget', '42'])).toThrow();
    }
}
