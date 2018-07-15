import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util"

export class EnumTests {
    @Test("Invalid heterogeneous enum")
    public invalidHeterogeneousEnum() {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `enum TestEnum {
                    a,
                    b = "ok",
                    c,
                }`
            );
        }).toThrowError(Error, "Invalid heterogeneous enum.");
    }

    @Test("Unsuported enum")
    public unsuportedEnum() {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `enum TestEnum {
                    val1 = [],
                    val2 = "ok",
                    val3 = "bye"
                }`
            );
        }).toThrowError(Error, "Only numeric or string initializers allowed for enums.");
    }
}
