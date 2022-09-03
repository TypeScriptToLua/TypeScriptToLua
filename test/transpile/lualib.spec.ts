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
