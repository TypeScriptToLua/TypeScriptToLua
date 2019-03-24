import * as util from "../util";

import { TranspileError } from "../../src/TranspileError";

test("Declare const enum", () => {
    const testCode = `
        declare const enum TestEnum {
            MEMBER_ONE = "test",
            MEMBER_TWO = "test2"
        }

        const valueOne = TestEnum.MEMBER_ONE;
    `;

    expect(util.transpileString(testCode)).toBe(`local valueOne = "test";`);
});

test("Const enum", () => {
    const testCode = `
        const enum TestEnum {
            MEMBER_ONE = "test",
            MEMBER_TWO = "test2"
        }

        const valueOne = TestEnum.MEMBER_TWO;
    `;

    expect(util.transpileString(testCode)).toBe(`local valueOne = "test2";`);
});

test("Const enum without initializer", () => {
    const testCode = `
        const enum TestEnum {
            MEMBER_ONE,
            MEMBER_TWO
        }

        const valueOne = TestEnum.MEMBER_TWO;
    `;

    expect(util.transpileString(testCode)).toBe(`local valueOne = 1;`);
});

test("Const enum without initializer in some values", () => {
    const testCode = `
        const enum TestEnum {
            MEMBER_ONE = 3,
            MEMBER_TWO,
            MEMBER_THREE = 5
        }

        const valueOne = TestEnum.MEMBER_TWO;
    `;

    expect(util.transpileString(testCode)).toBe(`local valueOne = 4;`);
});

test("Invalid heterogeneous enum", () => {
    expect(() => {
        const lua = util.transpileString(
            `enum TestEnum {
                a,
                b = "ok",
                c,
            }`,
        );
    }).toThrowExactError(
        new TranspileError(
            "Invalid heterogeneous enum. Enums should either specify no " +
                "member values, or specify values (of the same type) for all members.",
        ),
    );
});

test("String literal name in enum", () => {
    const code = `enum TestEnum {
            ["name"] = "foo"
        }
        return TestEnum["name"];`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

test("Enum identifier value internal", () => {
    const result = util.transpileAndExecute(
        `enum testEnum {
            abc,
            def,
            ghi = def,
            jkl,
        }
        return \`\${testEnum.abc},\${testEnum.def},\${testEnum.ghi},\${testEnum.jkl}\`;`,
    );

    expect(result).toBe("0,1,1,2");
});

test("Enum identifier value internal recursive", () => {
    const result = util.transpileAndExecute(
        `enum testEnum {
            abc,
            def,
            ghi = def,
            jkl = ghi,
        }
        return \`\${testEnum.abc},\${testEnum.def},\${testEnum.ghi},\${testEnum.jkl}\`;`,
    );

    expect(result).toBe("0,1,1,1");
});

test("Enum identifier value external", () => {
    const result = util.transpileAndExecute(
        `const ext = 6;
        enum testEnum {
            abc,
            def,
            ghi = ext,
        }
        return \`\${testEnum.abc},\${testEnum.def},\${testEnum.ghi}\`;`,
    );

    expect(result).toBe("0,1,6");
});

test("Enum reverse mapping", () => {
    const result = util.transpileAndExecute(
        `enum testEnum {
            abc,
            def,
            ghi
        }
        return testEnum[testEnum.abc] + testEnum[testEnum.ghi]`,
    );

    expect(result).toBe("abcghi");
});

test("Const enum index", () => {
    const result = util.transpileAndExecute(
        `const enum testEnum {
            abc,
            def,
            ghi
        }
        return testEnum["def"];`,
    );

    expect(result).toBe(1);
});

test("Const enum index identifier value", () => {
    const result = util.transpileAndExecute(
        `const enum testEnum {
            abc,
            def = 4,
            ghi,
            jkl = ghi
        }
        return testEnum["jkl"];`,
    );

    expect(result).toBe(5);
});

test("Const enum index identifier chain", () => {
    const result = util.transpileAndExecute(
        `const enum testEnum {
            abc = 3,
            def,
            ghi = def,
            jkl = ghi,
        }
        return testEnum["ghi"];`,
    );

    expect(result).toBe(4);
});
