import * as util from "../util";

// TODO: string.toString()
const serializeEnum = (identifier: string) => `(() => {
    const mappedTestEnum: any = {};
    for (const key in ${identifier}) {
        mappedTestEnum[(key as any).toString()] = ${identifier}[key];
    }
    return mappedTestEnum;
})()`;

describe("initializers", () => {
    test("string", () => {
        util.testFunction`
            enum TestEnum {
                A = "A",
                B = "B",
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });

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

    test("expression with side effect", () => {
        util.testFunction`
            let value = 0;
            enum TestEnum {
                A = value++,
                B = A,
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

    test("member reference", () => {
        util.testFunction`
            enum TestEnum {
                A,
                B = A,
                C = B,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });

    test("string literal member reference", () => {
        util.testFunction`
            enum TestEnum {
                ["A"],
                "B" = A,
                C = B,
            }

            return ${serializeEnum("TestEnum")}
        `.expectToMatchJsResult();
    });
});

describe("const enum", () => {
    const expectToBeConst: util.TapCallback = builder =>
        expect(builder.getMainLuaCodeChunk()).not.toContain("TestEnum");

    test.each(["", "declare "])("%swithout initializer", modifier => {
        util.testModule`
            ${modifier} const enum TestEnum {
                A,
                B,
            }

            export const A = TestEnum.A;
        `
            .tap(expectToBeConst)
            .expectToMatchJsResult();
    });

    test("with string initializer", () => {
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

test("toString", () => {
    util.testFunction`
        enum TestEnum {
            A,
            B,
            C,
        }

        function foo(value: TestEnum) {
            return value.toString();
        }

        return foo(TestEnum.A);
    `.expectToMatchJsResult();
});
