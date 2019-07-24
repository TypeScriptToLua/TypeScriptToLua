import * as TSTLErrors from "../../src/TSTLErrors";
import * as util from "../util";

// TODO: string.toString()
const serializeAndReturnTestEnum = () => `
    const mappedTestEnum: any = {};
    for (const key in TestEnum) {
        mappedTestEnum[(key as any).toString()] = TestEnum[key];
    }
    return mappedTestEnum;
`;

test("without initializer", () => {
    util.testFunction`
        enum TestEnum {
            A,
            B,
            C,
        }

        ${serializeAndReturnTestEnum}
    `.expectToMatchJsResult();
});

test("expression initializer", () => {
    util.testFunction`
        const value = 6;
        enum TestEnum {
            A,
            B = value,
        }

        ${serializeAndReturnTestEnum}
    `.expectToMatchJsResult();
});

test("initializer inference", () => {
    util.testFunction`
        const enum TestEnum {
            A = 3,
            B,
            C = 5,
        }

        return TestEnum.B;
    `.expectToMatchJsResult();
});

test("initializer referencing other member", () => {
    util.testFunction`
        enum TestEnum {
            A,
            B = A,
            C,
        }

        ${serializeAndReturnTestEnum}
    `.expectToMatchJsResult();
});

test("initializer referencing other member with initializer referencing other member", () => {
    util.testFunction`
        enum TestEnum {
            A,
            B = A,
            C = B,
        }

        ${serializeAndReturnTestEnum}
    `.expectToMatchJsResult();
});

test.skip("string literal member name", () => {
    util.testFunction`
        enum TestEnum {
            ["A"] = "foo",
        }

        ${serializeAndReturnTestEnum}
    `.expectToMatchJsResult();
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
