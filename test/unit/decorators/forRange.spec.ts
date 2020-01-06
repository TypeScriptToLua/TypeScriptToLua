import * as util from "../../util";

const createForRangeDeclaration = (args = "i: number, j: number, k?: number", returns = "number[]") => `
    /** @forRange */
    declare function luaRange(${args}): ${returns};
`;

test.each([
    { args: [1, 10], results: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { args: [1, 10, 2], results: [1, 3, 5, 7, 9] },
    { args: [10, 1, -1], results: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { args: [10, 1, -2], results: [10, 8, 6, 4, 2] },
])("usage in for...of loop", ({ args, results }) => {
    util.testModule`
        ${createForRangeDeclaration()}
        export const results: number[] = [];

        for (const i of luaRange(${args})) {
            results.push(i);
        }
    `
        .setReturnExport("results")
        .expectToEqual(results);
});

describe("invalid usage", () => {
    test("non-ambient declaration", () => {
        util.testModule`
            /** @forRange */
            function luaRange() {}
        `.expectDiagnostics(m =>
            m.toMatchInlineSnapshot(
                `"main.ts(3,22): error TSTL: Invalid @forRange call: can be used only as an iterable in a for...of loop."`
            )
        );
    });

    test.each<[number[]]>([[[]], [[1]], [[1, 2, 3, 4]]])("argument count (%p)", args => {
        util.testModule`
            ${createForRangeDeclaration("...args: number[]")}
            for (const i of luaRange(${args})) {}
        `.expectDiagnosticsToMatchSnapshot();
    });

    test("non-declared loop variable", () => {
        util.testModule`
            ${createForRangeDeclaration()}
            let i: number;
            for (i of luaRange(1, 10, 2)) {}
        `.expectDiagnostics(m =>
            m.toMatchInlineSnapshot(
                `"main.ts(7,18): error TSTL: Invalid @forRange call: loop must declare it's own control variable."`
            )
        );
    });

    test("argument types", () => {
        util.testModule`
            ${createForRangeDeclaration("i: string, j: number")}
            for (const i of luaRange("foo", 2)) {}
        `.expectDiagnostics(m =>
            m.toMatchInlineSnapshot(`"main.ts(6,29): error TSTL: Invalid @forRange call: arguments must be numbers."`)
        );
    });

    test("variable destructuring", () => {
        util.testModule`
            ${createForRangeDeclaration(undefined, "number[][]")}
            for (const [i] of luaRange(1, 10, 2)) {}
        `.expectDiagnostics(m =>
            m.toMatchInlineSnapshot(
                `"main.ts(6,18): error TSTL: Invalid @forRange call: destructuring cannot be used."`
            )
        );
    });

    test("return type", () => {
        util.testModule`
            ${createForRangeDeclaration(undefined, "string[]")}
            for (const i of luaRange(1, 10)) {}
        `.expectDiagnostics(m =>
            m.toMatchInlineSnapshot(
                `"main.ts(6,29): error TSTL: Invalid @forRange call: function must return Iterable<number>."`
            )
        );
    });

    test.each([
        "const range = luaRange(1, 10);",
        "luaRange.call(null, 0, 0, 0);",
        "let array = [0, luaRange, 1];",
        "const call = undefined as any; call(luaRange);",
        "for (const i of [...luaRange(1, 10)]) {}",
    ])("reference (%p)", statement => {
        util.testModule`
            ${createForRangeDeclaration()}
            ${statement}
        `.expectDiagnosticsToMatchSnapshot();
    });
});
