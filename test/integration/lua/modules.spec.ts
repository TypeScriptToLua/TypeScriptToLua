import { Expect, Test, TestCase, IgnoreTest } from "alsatian";
import * as util from "../../src/util"

export class LuaLoopTests {

    @TestCase(
        "export function publicFunc() {}",

        "local exports = exports or {}\n" +
        "local function publicFunc()\n" +
        "end\n" +
        "exports.publicFunc = publicFunc\n" +
        "return exports"
    )
    @Test("export")
    @IgnoreTest()
    public export<T>(inp: string, expected: string) {
        // Transpile
        let lua = util.transpileString(inp, util.dummyTypes.Object);

        // Assert
        Expect(lua).toBe(expected);
    }
}
