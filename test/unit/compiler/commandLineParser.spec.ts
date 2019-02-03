import { Expect, Test, TestCase } from "alsatian";
import { parseCommandLine } from "../../../src/CommandLineParser";
import { LuaLibImportKind, LuaTarget } from "../../../src/CompilerOptions";

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
        Expect(result.options.luaLibImport).toBe(expected);
    }

    @Test("CLI parser invalid luaLibImportKind")
    public cliParserInvalidLuaLibImportKind(): void {
        Expect(() => parseCommandLine(["--luaLibImport", "invalid"])).toThrow();
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
        Expect(result.options.luaTarget).toBe(expected);
    }

    @Test("CLI parser invalid luaTarget")
    public cliParserInvalidLuaTarget(): void {
        Expect(() => parseCommandLine(["--luatTarget", "invalid"])).toThrow();
    }

    @TestCase([""], false)
    @TestCase(["--noHeader", "true"], true)
    @TestCase(["--noHeader", "false"], false)
    @Test("CLI parser noHeader")
    public cliParserNoHeader(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        Expect(result.options.noHeader).toBe(expected);
    }

    @TestCase([""], false)
    @TestCase(["--project", "tsconfig.json"], true)
    @TestCase(["-p", "tsconfig.json"], true)
    @Test("CLI parser project")
    public cliParserProject(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        Expect(result.options.project !== undefined).toBe(expected);
    }

    @TestCase([""], false)
    @TestCase(["--help"], true)
    @TestCase(["-h"], true)
    @Test("CLI parser project")
    public cliParserHelp(args: string[], expected: boolean): void {
        const result = parseCommandLine(args);
        Expect(result.options.help === true).toBe(expected);
    }
}