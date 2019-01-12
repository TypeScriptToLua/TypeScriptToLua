import { Expect, Test, TestCase } from "alsatian";

import { findConfigFile, parseCommandLine } from "../../src/CommandLineParser";

export class CLITests {

    @Test("defaultOption")
    @TestCase("luaTarget", "JIT")
    @TestCase("noHeader", false)
    @TestCase("luaLibImport", "inline")
    @TestCase("rootDir", process.cwd())
    @TestCase("outDir", process.cwd())
    public defaultOptions(option: any, expected: any): void {
        const parsedCommandLine = parseCommandLine([]);

        Expect(expected).toBe(parsedCommandLine.options[option]);
    }

    @Test("ValidLuaTarget")
    public validLuaTarget(): void {
        const parsedCommandLine = parseCommandLine(['--luaTarget', '5.3']);
        Expect(parsedCommandLine.options["luaTarget"]).toBe("5.3");
    }

    @Test("InvalidLuaTarget")
    public invalidLuaTarget(): void {
        // Don't check error message because the yargs library messes the message up.
        Expect(() => parseCommandLine(['--luaTarget', '42'])).toThrow();
    }

    @Test("InvalidArgumentTSTL")
    public invalidArgument(): void {
        // Don't check error message because the yargs library messes the message up.
        Expect(() => parseCommandLine(['--invalidTarget', 'test'])).toThrow();
    }

    @Test("outDir")
    public outDir(): void {
        const parsedCommandLine = parseCommandLine(['--outDir', './test']);

        Expect(parsedCommandLine.options['outDir']).toBe('./test');
    }

    @Test("rootDir")
    public rootDir(): void {
        const parsedCommandLine = parseCommandLine(['--rootDir', './test']);

        Expect(parsedCommandLine.options['rootDir']).toBe('./test');
        Expect(parsedCommandLine.options['outDir']).toBe('./test');
    }

    @Test("outDirAndRooDir")
    public outDirAndRooDir(): void {
        const parsedCommandLine = parseCommandLine(['--outDir', './testOut', '--rootDir', './testRoot']);

        Expect(parsedCommandLine.options['outDir']).toBe('./testOut');
        Expect(parsedCommandLine.options['rootDir']).toBe('./testRoot');
    }

    @Test("Find config no path")
    public findConfigNoPath(): void {
        Expect(() => findConfigFile({options: {}, fileNames: [], errors: []})).toThrow();

    }

}
