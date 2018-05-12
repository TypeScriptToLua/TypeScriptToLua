import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class LuaErrorTests {

    @Test("throwString")
    public trowString() {
        // Transpile
        const lua = util.transpileString(
            `throw "Some Error"`
        );
        // Assert
        Expect(lua).toBe(`error("Some Error")`);
    }

    @Test("throwError")
    public throwError() {
        // Transpile & Asser
        Expect(() => {
            const lua = util.transpileString(
                `throw Error("Some Error")`
            );
        }).toThrowError(Error, "Unsupported throw expression, only string literals are supported");
    }
}
