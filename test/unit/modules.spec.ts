import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util"

const dedent = require('dedent')

export class LuaModuleTests {

    @Test("defaultImport")
    public defaultImport() {
        Expect(() => {
            let lua = util.transpileString(`import TestClass from "test"`);
        }).toThrowError(Error, "Default Imports are not supported, please use named imports instead!");
    }

    @Test("lualibRequire")
    public lualibRequire() {
        // Transpile
        let lua = util.transpileString(``, {dontRequireLuaLib: false, luaTarget: "JIT"});

        // Assert
        Expect(dedent(lua)).toBe(`require("typescript_lualib")`);
    }
}
