import { Expect, Test, TestCase } from "alsatian";

import { findConfigFile, parseCommandLine } from "../../src/CommandLineParser";
import { LuaTarget, LuaLibImportKind } from "../../src/CompilerOptions";

export class CommandLineParserTests
{
    @TestCase([""], LuaLibImportKind.Inline)
    @TestCase(["--luaLibImport", "none"], LuaLibImportKind.None)
    @TestCase(["--luaLibImport", "always"], LuaLibImportKind.Always)
    @TestCase(["--luaLibImport", "inline"], LuaLibImportKind.Inline)
    @TestCase(["--luaLibImport", "require"], LuaLibImportKind.Require)
    @Test("CLI parser luaLibImportKind")
    public cliParserLuaLibImportKind(args: string[], expected: LuaLibImportKind): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.luaLibImport).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @Test("CLI parser invalid luaLibImportKind")
    public cliParserInvalidLuaLibImportKind(): void {
        const result = parseCommandLine(["--luaLibImport", "invalid"]);
        Expect(result.isValid).toBe(false);
    }

    @TestCase([""], LuaTarget.LuaJIT)
    @TestCase(["--luaTarget", "5.1"], LuaTarget.Lua51)
    @TestCase(["--luaTarget", "5.2"], LuaTarget.Lua52)
    @TestCase(["--luaTarget", "jit"], LuaTarget.LuaJIT)
    @TestCase(["--luaTarget", "JIT"], LuaTarget.LuaJIT)
    @TestCase(["--luaTarget", "5.3"], LuaTarget.Lua53)
    @Test("CLI parser luaTarget")
    public cliParserLuaTarget(args: string[], expected: LuaTarget): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.luaTarget).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @TestCase(["-lt", "5.1"], LuaTarget.Lua51)
    @TestCase(["-lt", "5.2"], LuaTarget.Lua52)
    @TestCase(["-lt", "jit"], LuaTarget.LuaJIT)
    @TestCase(["-lt", "JIT"], LuaTarget.LuaJIT)
    @TestCase(["-lt", "5.3"], LuaTarget.Lua53)
    @Test("CLI parser luaTarget")
    public cliParserLuaTargetAlias(args: string[], expected: LuaTarget): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.luaTarget).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @Test("CLI parser invalid luaTarget")
    public cliParserInvalidLuaTarget(): void {
        const result = parseCommandLine(["--luatTarget", "invalid"]);
        Expect(result.isValid).toBe(false);
    }

    @TestCase([""], false)
    @TestCase(["--noHeader", "true"], true)
    @TestCase(["--noHeader", "false"], false)
    @TestCase(["--noHeader"], true)
    @TestCase(["--noHeader", "--noHoisting"], true)
    @Test("CLI parser noHeader")
    public cliParserNoHeader(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.noHeader).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @TestCase([""], false)
    @TestCase(["--noHoisting", "true"], true)
    @TestCase(["--noHoisting", "false"], false)
    @TestCase(["--noHoisting"], true)
    @TestCase(["--noHoisting", "--noHeader"], true)
    @Test("CLI parser noHoisting")
    public cliParserNoHoisting(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.noHoisting).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @TestCase([""], false)
    @TestCase(["--project", "tsconfig.json"], true)
    @TestCase(["-p", "tsconfig.json"], true)
    @Test("CLI parser project")
    public cliParserProject(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.project !== undefined).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @Test("CLI Parser Multiple Options")
    public cliParserMultipleOptions(): void {
        const commandLine = "--project tsconfig.json --noHeader --noHoisting -lt 5.3";
        const result = parseCommandLine(commandLine.split(" "));

        if (result.isValid === true) {
            Expect(result.result.options.project).toBeDefined();
            Expect(result.result.options.noHeader).toBe(true);
            Expect(result.result.options.noHoisting).toBe(true);
            Expect(result.result.options.luaTarget).toBe(LuaTarget.Lua53);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @TestCase([""], false)
    @TestCase(["--help"], true)
    @TestCase(["-h"], true)
    @Test("CLI parser project")
    public cliParserHelp(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.help === true).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @TestCase([""], false)
    @TestCase(["--version"], true)
    @TestCase(["-v"], true)
    @Test("CLI parser project")
    public cliParserVersion(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        if (result.isValid === true) {
            Expect(result.result.options.version === true).toBe(expected);
        } else {
            Expect(result.isValid).toBeTruthy();
        }
    }

    @Test("defaultOption")
    @TestCase("luaTarget", LuaTarget.LuaJIT)
    @TestCase("noHeader", false)
    @TestCase("luaLibImport", "inline")
    @TestCase("rootDir", process.cwd())
    @TestCase("outDir", process.cwd())
    public defaultOptions(option: any, expected: any): void {
        const parsedCommandLine = parseCommandLine([]);
        if (parsedCommandLine.isValid) {
            Expect(expected).toBe(parsedCommandLine.result.options[option]);
        } else {
            Expect(parsedCommandLine.isValid).toBeTruthy();
        }
    }

    @Test("ValidLuaTarget")
    public validLuaTarget(): void {
        const parsedCommandLine = parseCommandLine(['--luaTarget', '5.3']);
        if (parsedCommandLine.isValid) {
            Expect(parsedCommandLine.result.options["luaTarget"]).toBe("5.3");
        } else {
            Expect(parsedCommandLine.isValid).toBeTruthy();
        }
    }

    @Test("InvalidLuaTarget")
    public invalidLuaTarget(): void {
        // Don't check error message because the yargs library messes the message up.
        const result = parseCommandLine(['--luaTarget', '42']);
        Expect(result.isValid).toBe(false);
    }

    @Test("InvalidArgumentTSTL")
    public invalidArgument(): void {
        // Don't check error message because the yargs library messes the message up.
        const result = parseCommandLine(['--invalidTarget', 'test']);
        Expect(result.isValid).toBe(false);
    }

    @Test("outDir")
    public outDir(): void {
        const parsedCommandLine = parseCommandLine(['--outDir', './test']);

        if (parsedCommandLine.isValid) {
            Expect(parsedCommandLine.result.options['outDir']).toBe('./test');
        } else {
            Expect(parsedCommandLine.isValid).toBeTruthy();
        }
    }

    @Test("rootDir")
    public rootDir(): void {
        const parsedCommandLine = parseCommandLine(['--rootDir', './test']);

        if (parsedCommandLine.isValid) {
            Expect(parsedCommandLine.result.options['rootDir']).toBe('./test');
            Expect(parsedCommandLine.result.options['outDir']).toBe('./test');
        } else {
            Expect(parsedCommandLine.isValid).toBeTruthy();
        }
    }

    @Test("outDirAndRooDir")
    public outDirAndRooDir(): void {
        const parsedCommandLine = parseCommandLine(['--outDir', './testOut', '--rootDir', './testRoot']);

        if (parsedCommandLine.isValid) {
            Expect(parsedCommandLine.result.options['outDir']).toBe('./testOut');
            Expect(parsedCommandLine.result.options['rootDir']).toBe('./testRoot');
        } else {
            Expect(parsedCommandLine.isValid).toBeTruthy();
        }
    }

    @Test("Find config no path")
    public findConfigNoPath(): void {
        const result = findConfigFile({ options: {}, fileNames: [], errors: [] });
        Expect(result.isValid).toBe(false);
    }
}
