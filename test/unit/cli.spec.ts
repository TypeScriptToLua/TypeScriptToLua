import { Expect, Test, TestCase, Teardown } from "alsatian";

import { CompilerOptions, parseCommandLine, ParsedCommandLine } from "../../src/CommandLineParser";


export class CLITests {

    @Test("defaultOption")
    @TestCase("luaTarget", "JIT")
    @TestCase("addHeader", false)
    @TestCase("dontRequireLuaLib", false)
    @TestCase("rootDir", process.cwd())
    @TestCase("outDir", process.cwd())
    public defaultOptions(option: any, expected: any) {
        let parsedCommandLine = parseCommandLine([]);

        Expect(expected).toBe(parsedCommandLine.options[option]);
    }

    @Test("InvalidLuaTarget")
    public invalidLuaTarget() {
        // Don't check error message because the yargs library messes the message up.
        Expect(() => parseCommandLine(['--luaTarget', '42'])).toThrow();
    }

    @Test("InvalidArgument")
    public invalidArgument() {
        // Don't check error message because the yargs library messes the message up.
        Expect(() => parseCommandLine(['--invalidTarget', 'test'])).toThrow();
    }

    @Test("outDir")
    public outDir() {
        let parsedCommandLine = parseCommandLine(['--outDir', './test']);

        Expect(parsedCommandLine.options['outDir']).toBe('./test');
    }

    @Test("rootDir")
    public rootDir() {
        let parsedCommandLine = parseCommandLine(['--rootDir', './test']);

        Expect(parsedCommandLine.options['rootDir']).toBe('./test');
        Expect(parsedCommandLine.options['outDir']).toBe('./test');
    }

    @Test("outDirAndRooDir")
    public outDirAndRooDir() {
        let parsedCommandLine = parseCommandLine(['--outDir', './testOut', '--rootDir', './testRoot']);

        Expect(parsedCommandLine.options['outDir']).toBe('./testOut');
        Expect(parsedCommandLine.options['rootDir']).toBe('./testRoot');
    }

}
