import * as ts from "typescript";
import { LuaLibFeature } from "../../src";
import { loadLuaLibFeatures } from "../../src/LuaLib";

test.each(Object.entries(LuaLibFeature))("Lualib feature has correct dependencies (%p)", (_, feature) => {
    const lualibCode = loadLuaLibFeatures([feature], ts.sys);

    // Find all used lualib features
    const luaLibReferences = lualibCode.match(/__TS__[a-zA-Z_]+\(/g);

    // For every reference lualib function, check if its definition is also included
    const missingReferences = [];

    if (luaLibReferences !== null) {
        for (const reference of luaLibReferences) {
            if (
                !lualibCode.includes(`function ${reference}`) &&
                !lualibCode.includes(`${reference.substring(0, reference.length - 1)} =`)
            ) {
                missingReferences.push(reference);
            }
        }
    }

    expect(missingReferences).toHaveLength(0);
});
