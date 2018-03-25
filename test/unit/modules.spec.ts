import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class LuaModuleTests {

    @Test("defaultImport")
    public defaultImport() {
        Expect(() => {
            const lua = util.transpileString(`import TestClass from "test"`);
        }).toThrowError(Error, "Default Imports are not supported, please use named imports instead!");
    }

    @Test("lualibRequire")
    public lualibRequire() {
        // Transpile
        const lua = util.transpileString(``, {dontRequireLuaLib: false, luaTarget: "JIT"});

        // Assert
        Expect(lua).toBe(`require("typescript_lualib")`);
    }
}
