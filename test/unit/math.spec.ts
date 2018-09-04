import { Expect, Test, TestCase, IgnoreTest } from "alsatian";
import * as util from "../src/util"

export class MathTests {

    // Dont test all and dont do functional test
    // because math implementations may differ between js and lua
    @TestCase("Math.cos()", "math.cos();")
    @TestCase("Math.sin()", "math.sin();")
    @TestCase("Math.min()", "math.min();")
    @TestCase("Math.PI", "math.pi;")
    @Test("Math")
    public math(inp: string, expected: string) {
        // Transpile
        let lua = util.transpileString(
            inp,
        );

        // Assert
        Expect(lua).toBe(expected);
    }
}
