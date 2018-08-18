import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/Errors";

export class EnumTests {
    @Test("Invalid heterogeneous enum")
    public invalidHeterogeneousEnum(): void {
        // Transpile & Assert
        Expect(() => {
            const lua = util.transpileString(
                `enum TestEnum {
                    a,
                    b = "ok",
                    c,
                }`
            );
        }).toThrowError(TranspileError, "Invalid heterogeneous enum. Enums should either specify no "
                        + "member values, or specify values (of the same type) for all members.");
    }

    @Test("Unsuported enum")
    public unsuportedEnum(): void {
        // Transpile & Assert
        Expect(() => {
            const lua = util.transpileString(
                `enum TestEnum {
                    val1 = [],
                    val2 = "ok",
                    val3 = "bye"
                }`
            );
        }).toThrowError(TranspileError, "Only numeric or string initializers allowed for enums.");
    }
}
