import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/TranspileError";

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

            const valueOne = TestEnum.MEMBER_TWO;
        `;

        Expect(util.transpileString(testCode)).toBe(`local valueOne = "test2";`);
    }

    @Test("Const enum without initializer")
    public constEnumNoInitializer(): void {
        const testCode = `
            const enum TestEnum {
                MEMBER_ONE,
                MEMBER_TWO
            }

            const valueOne = TestEnum.MEMBER_TWO;
        `;

        Expect(util.transpileString(testCode)).toBe(`local valueOne = 1;`);
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

    @Test("String literal name in enum")
    public stringLiteralNameEnum(): void {
        const code = `enum TestEnum {
                ["name"] = "foo"
            }
            return TestEnum["name"];`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Enum identifier value internal")
    public enumIdentifierValueInternal(): void {
        const result = util.transpileAndExecute(
            `enum testEnum {
                abc,
                def,
                ghi = def,
                jkl,
            }
            return \`\${testEnum.abc},\${testEnum.def},\${testEnum.ghi},\${testEnum.jkl}\`;`
        );

        Expect(result).toBe("0,1,1,2");
    }

    @Test("Enum identifier value internal recursive")
    public enumIdentifierValueInternalRecursive(): void {
        const result = util.transpileAndExecute(
            `enum testEnum {
                abc,
                def,
                ghi = def,
                jkl = ghi,
            }
            return \`\${testEnum.abc},\${testEnum.def},\${testEnum.ghi},\${testEnum.jkl}\`;`
        );

        Expect(result).toBe("0,1,1,1");
    }

    @Test("Enum identifier value external")
    public enumIdentifierValueExternal(): void {
        const result = util.transpileAndExecute(
            `const ext = 6;
            enum testEnum {
                abc,
                def,
                ghi = ext,
            }
            return \`\${testEnum.abc},\${testEnum.def},\${testEnum.ghi}\`;`
        );

        Expect(result).toBe("0,1,6");
    }

    @Test("Enum reverse mapping")
    public enumReverseMapping(): void {
        const result = util.transpileAndExecute(
            `enum testEnum {
                abc,
                def,
                ghi
            }
            return testEnum[testEnum.abc] + testEnum[testEnum.ghi]`
        );

        Expect(result).toBe("abcghi");
    }

    @Test("Const enum index")
    public constEnumIndex(): void {
        const result = util.transpileAndExecute(
            `const enum testEnum {
                abc,
                def,
                ghi
            }
            return testEnum["def"];`
        );

        Expect(result).toBe(1);
    }

    @Test("Const enum index identifier value")
    public constEnumIndexIdnetifierValue(): void {
        const result = util.transpileAndExecute(
            `const enum testEnum {
                abc,
                def = 4,
                ghi,
                jkl = ghi
            }
            return testEnum["jkl"];`
        );

        Expect(result).toBe(5);
    }

    @Test("Const enum index identifier chain")
    public constEnumIndexIdnetifierChain(): void {
        const result = util.transpileAndExecute(
            `const enum testEnum {
                abc = 3,
                def,
                ghi = def,
                jkl = ghi,
            }
            return testEnum["ghi"];`
        );

        Expect(result).toBe(4);
    }
}
