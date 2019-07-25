import * as TSTLErrors from "../../src/TSTLErrors";
import * as util from "../util";

// TODO: string.toString()
const serializeEnum = (identifier: string) => `(() => {
    const mappedTestEnum: any = {};
    for (const key in ${identifier}) {
        mappedTestEnum[(key as any).toString()] = ${identifier}[key];
    }
    return mappedTestEnum;
})()`;

// TODO: Move to namespace tests?
test("in a namespace", () => {
    util.testModule`
        namespace Test {
            export enum TestEnum {
                A,
                B,
            }
        }

        export const result = ${serializeEnum("Test.TestEnum")}
    `.expectToMatchJsResult();
});

test.skip("string literal as a member name", () => {
    util.testFunction`
        enum TestEnum {
            ["A"],
        }

        return ${serializeEnum("TestEnum")}
    `.expectToMatchJsResult();
});

describe("initializers", () => {
    test("expression", () => {
        util.testFunction`
            const value = 6;
            enum TestEnum {
                A,
                B = value,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });

    test("inference", () => {
        util.testFunction`
            enum TestEnum {
                A,
                B,
                C,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });

    test("partial inference", () => {
        util.testFunction`
            enum TestEnum {
                A = 3,
                B,
                C = 5,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });

    test("other member reference", () => {
        util.testFunction`
            enum TestEnum {
                A,
                B = A,
                C = B,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });

    test.skip("string literal member reference", () => {
        util.testFunction`
            enum TestEnum {
                ["A"],
                B = A,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });
});

test("invalid heterogeneous enum", () => {
    util.testFunction`
        enum TestEnum {
            A,
            B = "B",
            C,
        }
    `
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(TSTLErrors.HeterogeneousEnum(util.nodeStub));
});

describe("const enum", () => {
    const expectToBeConst: util.TapCallback = builder =>
        expect(builder.getMainLuaCodeChunk()).not.toContain("TestEnum");

    test.each(["", "declare"])("%s without initializer", () => {
        util.testFunction`
            const enum TestEnum {
                A,
                B,
            }

            return TestEnum.A;
        `
            .tap(expectToBeConst)
            .expectToMatchJsResult();
    });

    test("with initializer", () => {
        util.testFunction`
            const enum TestEnum {
                A = "ONE",
                B = "TWO",
            }

            return TestEnum.A;
        `
            .tap(expectToBeConst)
            .expectToMatchJsResult();
    });

    test("access with string literal", () => {
        util.testFunction`
            const enum TestEnum {
                A,
                B,
                C,
            }

            return TestEnum["C"];
        `
            .tap(expectToBeConst)
            .expectToMatchJsResult();
    });
});

test("enum toString", () => {
    const code = `
        enum TestEnum {
            A,
            B,
            C,
        }
        let test = TestEnum.A;
        return test.toString();`;
    expect(util.transpileAndExecute(code)).toBe(0);
});

test("enum concat", () => {
    const code = `
        enum TestEnum {
            A,
            B,
            C,
        }
        let test = TestEnum.A;
        return test + "_foobar";`;
    expect(util.transpileAndExecute(code)).toBe("0_foobar");
});
