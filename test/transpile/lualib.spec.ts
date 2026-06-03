import * as ts from "typescript";
import { LuaLibFeature, LuaLibImportKind, LuaTarget } from "../../src";
import { readLuaLibFeature } from "../../src/LuaLib";
import * as util from "../util";
import path = require("path");

test.each(Object.entries(LuaLibFeature))("Lualib does not use ____exports (%p)", (_, feature) => {
    const lualibCode = readLuaLibFeature(feature, LuaTarget.Lua54, ts.sys);

    const exportsOccurrences = lualibCode.match(/____exports/g);
    expect(exportsOccurrences).toBeNull();
});

test("Lualib bundle does not assign globals", () => {
    // language=TypeScript
    util.testModule`
        declare const _G: LuaTable;
        declare const require: (this: void, module: string) => any;
        const globalKeys = new LuaTable();
        for (const [key] of _G) {
            globalKeys[key] = true;
        }
        require("lualib_bundle");
        for (const [key] of _G) {
            if (!globalKeys[key]) {
                error("Global was assigned: " + key);
            }
        }
    `
        .withLanguageExtensions()
        .expectNoExecutionError();
});

test("Lualib recompile with import kind require", () => {
    const { transpiledFiles } = util.testExpression`Array.isArray({})`
        .setOptions({
            recompileLuaLib: true,
            luaPlugins: [{ name: path.join(__dirname, "./plugins/beforeEmit.ts") }],
        })
        .expectToHaveNoDiagnostics()
        .getLuaResult();
    const lualibBundle = transpiledFiles.find(f => f.outPath === "lualib_bundle.lua");
    expect(lualibBundle).toBeDefined();

    // plugin apply twice: main compilation and lualib recompile
    expect(lualibBundle?.lua).toContain(
        "-- Comment added by beforeEmit plugin\n-- Comment added by beforeEmit plugin\n"
    );
});

test("Lualib recompile with import kind require minimal", () => {
    const builder = util.testExpression`Array.isArray(123)`
        .setOptions({
            luaLibImport: LuaLibImportKind.RequireMinimal,
            recompileLuaLib: true,
            luaPlugins: [{ name: path.join(__dirname, "./plugins/visitor.ts") }],
        })
        .expectToHaveNoDiagnostics()
        .expectToEqual(true);
    const transpiledFiles = builder.getLuaResult().transpiledFiles;
    const lualibBundle = transpiledFiles.find(f => f.outPath === "lualib_bundle.lua");
    expect(lualibBundle).toBeDefined();
});

test("Lualib recompile with import kind inline", () => {
    util.testExpression`Array.isArray(123)`
        .setOptions({
            luaLibImport: LuaLibImportKind.Inline,
            recompileLuaLib: true,
            luaPlugins: [{ name: path.join(__dirname, "./plugins/visitor.ts") }],
        })
        .expectToHaveNoDiagnostics()
        .expectToEqual(true);
});

test("Lualib recompile with bundling", () => {
    util.testExpression`Array.isArray(123)`
        .setOptions({
            luaBundle: "bundle.lua",
            luaBundleEntry: "main.ts",
            luaLibImport: LuaLibImportKind.RequireMinimal,
            recompileLuaLib: true,
            luaPlugins: [{ name: path.join(__dirname, "./plugins/visitor.ts") }],
        })
        .expectToHaveNoDiagnostics()
        .expectToEqual(true);
});
