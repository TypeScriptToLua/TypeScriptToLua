import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/Errors";

export class LuaErrorTests {

    @Test("throwString")
    public trowString(): void {
        // Transpile
        const lua = util.transpileString(
            `throw "Some Error"`
        );
        // Assert
        Expect(lua).toBe(`error("Some Error");`);
    }

    @Test("throwError")
    public throwError(): void {
        // Transpile & Asser
        Expect(() => {
            const lua = util.transpileString(
                `throw Error("Some Error")`
            );
        }).toThrowError(TranspileError, "Invalid throw expression, only strings can be thrown.");
    }
}
