import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/Errors";

export class EnumTests {
    @Test("Declare const enum")
    public declareConstEnum(): void {
        const testCode = `
            declare const enum TestEnum {
                MEMBER_ONE = "test",
                MEMBER_TWO = "test2"
            }

            const valueOne = TestEnum.MEMBER_ONE;
        `;

        Expect(util.transpileString(testCode)).toBe(`local valueOne = "test";`);
    }

    @Test("Const enum")
    public constEnum(): void {
        const testCode = `
            const enum TestEnum {
                MEMBER_ONE = "test",
                MEMBER_TWO = "test2"
            }

            const valueOne = TestEnum.MEMBER_ONE;
        `;

        Expect(util.transpileString(testCode)).toBe(`local valueOne = "test";`);
    }

    @Test("Const enum without initializer")
    public constEnumNoInitializer(): void {
        const testCode = `
            const enum TestEnum {
                MEMBER_ONE,
                MEMBER_TWO
            }

            const valueOne = TestEnum.MEMBER_ONE;
        `;

        Expect(util.transpileString(testCode)).toBe(`local valueOne = 0;`);
    }

    @Test("Const enum without initializer in some values")
    public constEnumNoInitializerInSomeValues(): void {
        const testCode = `
            const enum TestEnum {
                MEMBER_ONE = 3,
                MEMBER_TWO,
                MEMBER_THREE = 5
            }

            const valueOne = TestEnum.MEMBER_TWO;
        `;

        Expect(util.transpileString(testCode)).toBe(`local valueOne = 4;`);
    }

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

    @Test("String literal name in enum")
    public stringLiteralNameEnum(): void {
        const code = `enum TestEnum {
                ["name"] = "foo"
            }
            return TestEnum["name"];`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }
}
