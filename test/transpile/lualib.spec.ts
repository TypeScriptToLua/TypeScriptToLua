import * as ts from "typescript";
import { LuaLibFeature, LuaTarget } from "../../src";
import { readLuaLibFeature } from "../../src/LuaLib";
import * as util from "../util";

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

test("Lualib bundle can be renamed", () => {
    const result = util
        .testExpression("[1, 2, 3, 4].map(n => n*n).join(' ')")
        .setOptions({ luaLibName: "typescript" })
        .expectNoExecutionError()
        .getLuaResult();
    expect(result.transpiledFiles.some(file => file.outPath.match(/lualib_bundle.lua$/))).toBeFalsy();
    expect(result.transpiledFiles.some(file => file.outPath.match(/typescript.lua$/))).toBeTruthy();
});

test("Lualib bundle emission can be disabled", () => {
    const result = util
        .testExpression("[1, 2, 3, 4].map(n => n*n).join(' ')")
        .setOptions({ luaLibEmit: false })
        .expectNoTranspileException()
        .getLuaResult();
    expect(result.transpiledFiles.some(file => file.outPath.match(/lualib_bundle.lua$/))).toBeFalsy();
});
