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

test.each([
    { args: ["--project", "tsconfig.json"], expected: true },
    { args: ["-p", "tsconfig.json"], expected: true },
])("CLI parser project (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.project !== undefined).toBe(expected);
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

test.each([
    { args: [""], expected: undefined },
    { args: ["--help"], expected: true },
    { args: ["-h"], expected: true },
])("CLI parser project (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.help).toBe(expected);
});

test.each([
    { args: [""], expected: undefined },
    { args: ["--version"], expected: true },
    { args: ["-v"], expected: true },
])("CLI parser project (%p)", ({ args, expected }) => {
    const result = tstl.parseCommandLine(args);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.version).toBe(expected);
});

test("ValidLuaTarget", () => {
    const result = tstl.parseCommandLine(["--luaTarget", "5.3"]);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.luaTarget).toBe("5.3");
});

test("InvalidLuaTarget", () => {
    // Don't check error message because the yargs library messes the message up.
    const result = tstl.parseCommandLine(["--luaTarget", "42"]);

    expect(result.errors.map(err => err.messageText)).not.toHaveLength(0);
});

test("InvalidArgumentTSTL", () => {
    // Don't check error message because the yargs library messes the message up.
    const result = tstl.parseCommandLine(["--invalidTarget", "test"]);

    expect(result.errors.map(err => err.messageText)).not.toHaveLength(0);
});

test("outDir", () => {
    const result = tstl.parseCommandLine(["--outDir", "./test"]);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.outDir).toBe("./test");
});

test("rootDir", () => {
    const result = tstl.parseCommandLine(["--rootDir", "./test"]);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.rootDir).toBe("./test");
    expect(result.options.outDir).toBe("./test");
});

test("outDirAndRooDir", () => {
    const result = tstl.parseCommandLine(["--outDir", "./testOut", "--rootDir", "./testRoot"]);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.outDir).toBe("./testOut");
    expect(result.options.rootDir).toBe("./testRoot");
});

test.each([
    { tsConfig: `{ noHeader: true }`, expected: true },
    { tsConfig: `{ noHeader: "true" }`, expected: true },
    { tsConfig: `{ tstl: { noHeader: true } }`, expected: true },
    { tsConfig: `{ tstl: { noHeader: "true" } }`, expected: true },
])("TsConfig noHeader (%p)", ({ tsConfig, expected }) => {
    const configJson = ts.parseConfigFileTextToJson("", tsConfig);
    const parsedJsonConfig = ts.parseJsonConfigFileContent(configJson.config, ts.sys, "");
    const result = tstl.updateParsedConfigFile(parsedJsonConfig);

    expect(result.errors.map(err => err.messageText)).toHaveLength(0);
    expect(result.options.noHeader).toBe(expected);
});
