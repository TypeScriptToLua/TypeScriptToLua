import { findConfigFile, parseCommandLine, parseTsConfigString } from "../../src/CommandLineParser";
import { LuaTarget, LuaLibImportKind } from "../../src/CompilerOptions";

test.each([
    { args: [""], expected: LuaLibImportKind.Inline },
    { args: ["--luaLibImport", "none"], expected: LuaLibImportKind.None },
    { args: ["--luaLibImport", "always"], expected: LuaLibImportKind.Always },
    { args: ["--luaLibImport", "inline"], expected: LuaLibImportKind.Inline },
    { args: ["--luaLibImport", "require"], expected: LuaLibImportKind.Require },
])("CLI parser luaLibImportKind (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.luaLibImport).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test("CLI parser invalid luaLibImportKind", () => {
    const result = parseCommandLine(["--luaLibImport", "invalid"]);
    expect(result.isValid).toBe(false);
});

test.each([
    { args: [""], expected: LuaTarget.LuaJIT },
    { args: ["--luaTarget", "5.1"], expected: LuaTarget.Lua51 },
    { args: ["--luaTarget", "5.2"], expected: LuaTarget.Lua52 },
    { args: ["--luaTarget", "jit"], expected: LuaTarget.LuaJIT },
    { args: ["--luaTarget", "JIT"], expected: LuaTarget.LuaJIT },
    { args: ["--luaTarget", "5.3"], expected: LuaTarget.Lua53 },
])("CLI parser luaTarget (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.luaTarget).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test.each([
    { args: ["-lt", "5.1"], expected: LuaTarget.Lua51 },
    { args: ["-lt", "5.2"], expected: LuaTarget.Lua52 },
    { args: ["-lt", "jit"], expected: LuaTarget.LuaJIT },
    { args: ["-lt", "JIT"], expected: LuaTarget.LuaJIT },
    { args: ["-lt", "5.3"], expected: LuaTarget.Lua53 },
])("CLI parser luaTarget (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.luaTarget).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test("CLI parser invalid luaTarget", () => {
    const result = parseCommandLine(["--luatTarget", "invalid"]);
    expect(result.isValid).toBe(false);
});

test.each([
    { args: [""], expected: false },
    { args: ["--noHeader", "true"], expected: true },
    { args: ["--noHeader", "false"], expected: false },
    { args: ["--noHeader"], expected: true },
    { args: ["--noHeader", "--noHoisting"], expected: true },
])("CLI parser noHeader (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.noHeader).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test.each([
    { args: [""], expected: false },
    { args: ["--noHoisting", "true"], expected: true },
    { args: ["--noHoisting", "false"], expected: false },
    { args: ["--noHoisting"], expected: true },
    { args: ["--noHoisting", "--noHeader"], expected: true },
])("CLI parser noHoisting (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.noHoisting).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test.each([
    { args: [""], expected: false },
    { args: ["--project", "tsconfig.json"], expected: true },
    { args: ["-p", "tsconfig.json"], expected: true },
])("CLI parser project (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.project !== undefined).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test("CLI Parser Multiple Options", () => {
    const commandLine = "--project tsconfig.json --noHeader --noHoisting -lt 5.3";
    const result = parseCommandLine(commandLine.split(" "));

    if (result.isValid === true) {
        expect(result.result.options.project).toBeDefined();
        expect(result.result.options.noHeader).toBe(true);
        expect(result.result.options.noHoisting).toBe(true);
        expect(result.result.options.luaTarget).toBe(LuaTarget.Lua53);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test.each([
    { args: [""], expected: false },
    { args: ["--help"], expected: true },
    { args: ["-h"], expected: true },
])("CLI parser project (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.help === true).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test.each([
    { args: [""], expected: false },
    { args: ["--version"], expected: true },
    { args: ["-v"], expected: true },
])("CLI parser project (%p)", ({ args, expected }) => {
    const result = parseCommandLine(args);
    if (result.isValid === true) {
        expect(result.result.options.version === true).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});

test.each([
    { option: "luaTarget", expected: LuaTarget.LuaJIT },
    { option: "noHeader", expected: false },
    { option: "luaLibImport", expected: "inline" },
    { option: "rootDir", expected: process.cwd() },
    { option: "outDir", expected: process.cwd() },
])("defaultOption (%p)", ({ option, expected }) => {
    const parsedCommandLine = parseCommandLine([]);
    if (parsedCommandLine.isValid) {
        expect(expected).toBe(parsedCommandLine.result.options[option]);
    } else {
        expect(parsedCommandLine.isValid).toBeTruthy();
    }
});

test("ValidLuaTarget", () => {
    const parsedCommandLine = parseCommandLine(["--luaTarget", "5.3"]);
    if (parsedCommandLine.isValid) {
        expect(parsedCommandLine.result.options["luaTarget"]).toBe("5.3");
    } else {
        expect(parsedCommandLine.isValid).toBeTruthy();
    }
});

test("InvalidLuaTarget", () => {
    // Don't check error message because the yargs library messes the message up.
    const result = parseCommandLine(["--luaTarget", "42"]);
    expect(result.isValid).toBe(false);
});

test("InvalidArgumentTSTL", () => {
    // Don't check error message because the yargs library messes the message up.
    const result = parseCommandLine(["--invalidTarget", "test"]);
    expect(result.isValid).toBe(false);
});

test("outDir", () => {
    const parsedCommandLine = parseCommandLine(["--outDir", "./test"]);

    if (parsedCommandLine.isValid) {
        expect(parsedCommandLine.result.options["outDir"]).toBe("./test");
    } else {
        expect(parsedCommandLine.isValid).toBeTruthy();
    }
});

test("rootDir", () => {
    const parsedCommandLine = parseCommandLine(["--rootDir", "./test"]);

    if (parsedCommandLine.isValid) {
        expect(parsedCommandLine.result.options["rootDir"]).toBe("./test");
        expect(parsedCommandLine.result.options["outDir"]).toBe("./test");
    } else {
        expect(parsedCommandLine.isValid).toBeTruthy();
    }
});

test("outDirAndRooDir", () => {
    const parsedCommandLine = parseCommandLine([
        "--outDir",
        "./testOut",
        "--rootDir",
        "./testRoot",
    ]);

    if (parsedCommandLine.isValid) {
        expect(parsedCommandLine.result.options["outDir"]).toBe("./testOut");
        expect(parsedCommandLine.result.options["rootDir"]).toBe("./testRoot");
    } else {
        expect(parsedCommandLine.isValid).toBeTruthy();
    }
});

test("Find config no path", () => {
    const result = findConfigFile({ options: {}, fileNames: [], errors: [] });
    expect(result.isValid).toBe(false);
});

test.each([
    { tsConfig: "{}" },
    { tsConfig: `{ noHeader: true }`, expected: true },
    { tsConfig: `{ noHeader: "true" }`, expected: true },
    { tsConfig: `{ tstl: { noHeader: true } }`, expected: true },
    { tsConfig: `{ tstl: { noHeader: "true" } }`, expected: true },
])("TsConfig noHeader (%p)", ({ tsConfig, expected }) => {
    const result = parseTsConfigString(tsConfig, "");

    if (result.isValid) {
        expect(result.result.options.noHeader).toBe(expected);
    } else {
        expect(result.isValid).toBeTruthy();
    }
});
