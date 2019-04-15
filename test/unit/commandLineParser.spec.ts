import * as ts from "typescript";
import * as tstl from "../../src";

test.each([
    { args: ["--luaLibImport", "none"], expected: tstl.LuaLibImportKind.None },
    { args: ["--luaLibImport", "always"], expected: tstl.LuaLibImportKind.Always },
    { args: ["--luaLibImport", "inline"], expected: tstl.LuaLibImportKind.Inline },
    { args: ["--luaLibImport", "require"], expected: tstl.LuaLibImportKind.Require },
    { args: ["--luaLibImport", "NoNe"], expected: tstl.LuaLibImportKind.None },
])("CLI parser luaLibImportKind (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.luaLibImport).toBe(expected);
});

test("CLI parser invalid luaLibImportKind", () => {
    const result = tstl.parseCommandLine(["--luaLibImport", "invalid"]);
    expect(result.errors.map(err => err.messageText)).not.toHaveLength(0);
});

test.each([
    { args: ["--luaTarget", "5.1"], expected: tstl.LuaTarget.Lua51 },
    { args: ["--luaTarget", "5.2"], expected: tstl.LuaTarget.Lua52 },
    { args: ["--luaTarget", "jit"], expected: tstl.LuaTarget.LuaJIT },
    { args: ["--luaTarget", "JiT"], expected: tstl.LuaTarget.LuaJIT },
    { args: ["--luaTarget", "JIT"], expected: tstl.LuaTarget.LuaJIT },
    { args: ["--luaTarget", "5.3"], expected: tstl.LuaTarget.Lua53 },
])("CLI parser luaTarget (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.luaTarget).toBe(expected);
});

test.each([
    { args: ["-lt", "5.1"], expected: tstl.LuaTarget.Lua51 },
    { args: ["-lt", "5.2"], expected: tstl.LuaTarget.Lua52 },
    { args: ["-lt", "jit"], expected: tstl.LuaTarget.LuaJIT },
    { args: ["-lt", "JIT"], expected: tstl.LuaTarget.LuaJIT },
    { args: ["-lt", "5.3"], expected: tstl.LuaTarget.Lua53 },
])("CLI parser luaTarget (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.luaTarget).toBe(expected);
});

test("CLI parser invalid luaTarget", () => {
    const result = tstl.parseCommandLine(["--luaTarget", "invalid"]);

    expect(result.errors.map(err => err.messageText)).not.toHaveLength(0);
});

test.each([
    { args: ["--noHeader", "true"], expected: true },
    { args: ["--noHeader", "false"], expected: false },
    { args: ["--noHeader"], expected: true },
    { args: ["--noHeader", "--noHoisting"], expected: true },
])("CLI parser noHeader (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.noHeader).toBe(expected);
});

test.each([
    { args: ["--noHoisting", "true"], expected: true },
    { args: ["--noHoisting", "false"], expected: false },
    { args: ["--noHoisting"], expected: true },
    { args: ["--noHoisting", "--noHeader"], expected: true },
])("CLI parser noHoisting (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.noHoisting).toBe(expected);
});

test("CLI Parser Multiple Options", () => {
    const commandLine = "--project tsconfig.json --noHeader --noHoisting -lt 5.3";
    const result = tstl.parseCommandLine(commandLine.split(" "));

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.project).toBe("tsconfig.json");
    expect(result.options.noHeader).toBe(true);
    expect(result.options.noHoisting).toBe(true);
    expect(result.options.luaTarget).toBe(tstl.LuaTarget.Lua53);
});

test("CLI parser invalid argument", () => {
    const result = tstl.parseCommandLine(["--invalidArgument"]);

    expect(result.errors.map(err => err.messageText)).not.toHaveLength(0);
});

test.each([
    { tsConfig: `{ noHeader: true }`, expected: true },
    { tsConfig: `{ tstl: { noHeader: true } }`, expected: true },
])("TsConfig noHeader (%p)", ({ tsConfig, expected }) => {
    const configJson = ts.parseConfigFileTextToJson("", tsConfig);
    const parsedJsonConfig = ts.parseJsonConfigFileContent(configJson.config, ts.sys, "");
    const result = tstl.updateParsedConfigFile(parsedJsonConfig);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.noHeader).toBe(expected);
});
