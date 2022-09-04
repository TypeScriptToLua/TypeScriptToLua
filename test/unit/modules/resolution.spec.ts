import * as ts from "typescript";
import { couldNotResolveRequire } from "../../../src/transpilation/diagnostics";
import * as util from "../../util";

const requireRegex = /require\("(.*?)"\)/;
const expectToRequire =
    (expected: string): util.TapCallback =>
    builder => {
        const [, requiredPath] = builder.getMainLuaCodeChunk().match(requireRegex) ?? [];
        expect(requiredPath).toBe(expected);
    };

test.each([
    {
        filePath: "main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "." },
    },
    {
        filePath: "main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "./" },
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expected: "src.folder.Module",
        options: { rootDir: "." },
    },
    {
        filePath: "main.ts",
        usedPath: "folder/Module",
        expected: "folder.Module",
        options: { rootDir: ".", baseUrl: "." },
    },
    {
        filePath: "main.ts",
        usedPath: "folder/Module",
        expected: "folder.Module",
        options: { rootDir: "./", baseUrl: "." },
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "src" },
    },
    {
        filePath: "src/main.ts",
        usedPath: "./folder/Module",
        expected: "folder.Module",
        options: { rootDir: "./src" },
    },
    {
        filePath: "src/dir/main.ts",
        usedPath: "../Module",
        expected: "Module",
        options: { rootDir: "./src" },
    },
    {
        filePath: "src/dir/dir/main.ts",
        usedPath: "../../dir/Module",
        expected: "dir.Module",
        options: { rootDir: "./src" },
    },
])("resolve paths with baseUrl or rootDir (%p)", ({ filePath, usedPath, expected, options }) => {
    util.testModule`
        import * as module from "${usedPath}";
        module;
    `
        .setMainFileName(filePath)
        .addExtraFile(`${usedPath}.ts`, "")
        .setOptions(options)
        .tap(expectToRequire(expected));
});

test("doesn't resolve paths out of root dir", () => {
    util.testModule`
        import * as module from "../module";
        module;
    `
        .setMainFileName("src/main.ts")
        .setOptions({ rootDir: "./src" })
        .disableSemanticCheck()
        .expectDiagnosticsToMatchSnapshot([couldNotResolveRequire.code]);
});

test("resolves non-standard requires", () => {
    const { transpiledFiles } = util.testModule`
        export * from "./externalLua";
    `
        .addExtraFile("externalLua.d.ts", "export const foo = 3;")
        .addExtraFile(
            "externalLua.lua",
            `
                require("requiredLuaFile1") -- standard
                require('requiredLuaFile2') -- single quote
                require'requiredLuaFile3'   -- no parentheses
                require"requiredLuaFile4"   -- no parentheses double quote
                require "requiredLuaFile5"  -- no parentheses and space
                require "requiredLua'File6"  -- no parentheses and space
                require 'requiredLua"File7'  -- no parentheses and space
            `
        )
        .addExtraFile("requiredLuaFile1.lua", "")
        .addExtraFile("requiredLuaFile2.lua", "")
        .addExtraFile("requiredLuaFile3.lua", "")
        .addExtraFile("requiredLuaFile4.lua", "")
        .addExtraFile("requiredLuaFile5.lua", "")
        .addExtraFile("requiredLua'File6.lua", "")
        .addExtraFile('requiredLua"File7.lua', "")
        .expectToHaveNoDiagnostics()
        .getLuaResult();

    // Expect main.lua, externalLua.lua and all 7 required lua files in there
    expect(transpiledFiles.map(f => f.outPath)).toHaveLength(9);
});

test.each([
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {}
        `,
        mainCode: 'import "fake";',
        expectedPath: "fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {}
        `,
        mainCode: 'import * as fake from "fake"; fake;',
        expectedPath: "fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {
                export const x: number;
            }
        `,
        mainCode: 'import { x } from "fake"; x;',
        expectedPath: "fake",
    },
    {
        declarationStatement: `
            /** @noResolution */
            declare module "fake" {
                export const x: number;
            }

            declare module "fake" {
                export const y: number;
            }
        `,
        mainCode: 'import { y } from "fake"; y;',
        expectedPath: "fake",
    },
])("noResolution prevents any module path resolution behavior", ({ declarationStatement, mainCode, expectedPath }) => {
    util.testModule(mainCode)
        .setMainFileName("src/main.ts")
        .addExtraFile("module.d.ts", declarationStatement)
        .tap(expectToRequire(expectedPath));
});

test("import = require", () => {
    util.testModule`
        import foo = require("./foo/bar");
        foo;
    `
        .setOptions({ module: ts.ModuleKind.CommonJS })
        .tap(expectToRequire("foo.bar"));
});
