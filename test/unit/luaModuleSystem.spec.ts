import * as util from "../util";
import * as ts from "typescript";
import { LuaModuleSystemKind } from "../../src";

test("luaModuleSystem with outFile prevents re-creates require and package", () => {
    util.testBundle`
        import { value } from "./module";
        if (value !== true) {
            throw "Failed to import value";
        }
    `
        .setOptions({ outFile: "main.lua", module: ts.ModuleKind.AMD, luaModuleSystem: LuaModuleSystemKind.None })
        .setModuleSystem("none")
        .addExtraFile("module.ts", "export const value = true;")
        .expectNoExecutionError();
});
