import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

export class LuaErrorTests {

    @Test("throwString")
    public trowString() {
        // Transpile
        let lua = util.transpileString(
            `throw "Some Error"`
            , util.dummyTypes.Number
        );
        // Assert
        Expect(lua).toBe(`error("Some Error")`);
    }

    @Test("throwError")
    public throwError() {
        // Transpile & Asser
        Expect(() => {
            let lua = util.transpileString(
                `throw Error("Some Error")`
                , util.dummyTypes.Number
            );
        }).toThrowError(Error, "Unsupported throw expression, only string literals are supported");
    }
}
