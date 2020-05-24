import * as util from "../../util";

test("@compileMembersOnly", () => {
    util.testFunction`
        /** @compileMembersOnly */
        enum TestEnum {
            A = 0,
            B = 2,
            C,
            D = "D",
        }

        return { A: TestEnum.A, B: TestEnum.B, C: TestEnum.C, D: TestEnum.D };
    `
        .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toContain("TestEnum"))
        .expectToMatchJsResult();
});

test("@compileMembersOnly in a namespace", () => {
    util.testModule`
        namespace Test {
            /** @compileMembersOnly */
            export enum TestEnum {
                A = "A",
                B = "B",
            }
        }

        export const A = Test.TestEnum.A;
    `
        .setReturnExport("A")
        .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain("Test.A"))
        .expectToEqual("A");
});
