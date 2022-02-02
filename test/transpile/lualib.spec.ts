import * as ts from "typescript";
import { LuaLibFeature } from "../../src";
import { readLuaLibFeature } from "../../src/LuaLib";

test.each(Object.entries(LuaLibFeature))("Lualib does not use ____exports (%p)", (_, feature) => {
    const lualibCode = readLuaLibFeature(feature, ts.sys);

    const exportsOccurrences = lualibCode.match(/____exports/g);
    expect(exportsOccurrences).toBeNull();
});
