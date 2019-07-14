import * as util from "../util";

const allBindings = "x, y, z";
const testCases = [
    { binding: "{ x }", value: { x: true } },
    { binding: "{ x, y }", value: { x: false, y: true } },
    { binding: "{ x: z, y }", value: { x: true, y: false } },
    { binding: "{ x: { x, y }, z }", value: { x: { x: true, y: false }, z: false } },
    { binding: "{ x, y = true }", value: { x: false, y: false } },
    { binding: "{ x = true }", value: {} },
    { binding: "{ x, y = true }", value: { x: false } },

    { binding: "[]", value: [] },
    { binding: "[x, y]", value: ["x", "y"] },
    { binding: "[x, , y]", value: ["x", "", "y"] },
    { binding: "[x = true]", value: [false] },
    { binding: "[[x, y]]", value: [["x", "y"]] },

    { binding: "{ y: [z = true] }", value: { y: [false] } },
    { binding: "{ x: [x, y] }", value: { x: ["x", "y"] } },
    { binding: "{ x: [{ y }] }", value: { x: [{ y: "y" }] } },
].map(({ binding, value }) => ({ binding, value: util.valueToString(value) }));

test.each([
    { binding: "{ x, y }, z", value: "{ x: false, y: false }, true" },
    { binding: "{ x, y }, { z }", value: "{ x: false, y: false }, { z: true }" },
    ...testCases,
])("in function parameter (%p)", ({ binding, value }) => {
    util.testFunction`
        let ${allBindings};
        function test(${binding}) {
            return { ${allBindings} };
        }

        return test(${value});
    `.expectToMatchJsResult();
});

test.each(testCases)("in variable declaration (%p)", ({ binding, value }) => {
    util.testFunction`
        let ${allBindings};
        {
            const ${binding} = ${value};
            return { ${allBindings} };
        }
    `.expectToMatchJsResult();
});

// TODO: https://github.com/TypeScriptToLua/TypeScriptToLua/issues/574
test.skip.each(testCases)("in assignment (%p)", ({ binding, value }) => {
    util.testFunction`
        let ${allBindings};
        (${binding} = ${value});
        return { ${allBindings} };
    `.expectToMatchJsResult();
});

test.each(testCases)("in exported variable declaration (%p)", ({ binding, value }) => {
    util.testModule`
        export const ${binding} = ${value};
    `.expectToMatchJsResult();
});

describe("array destructuring optimization", () => {
    // TODO: Try to generalize optimization logic between declaration and assignment and make more generic tests

    test("array", () => {
        util.testFunction`
            const array = [3, 5, 1];
            const [a, b, c] = array;
            return { a, b, c };
        `
            .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain("unpack"))
            .expectToMatchJsResult();
    });

    test("array literal", () => {
        util.testFunction`
            const [a, b, c] = [3, 5, 1];
            return { a, b, c };
        `
            .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toContain("unpack"))
            .expectToMatchJsResult();
    });

    test("array literal with extra values", () => {
        util.testFunction`
            let called = false;
            const set = () => { called = true; };
            const [head] = ["foo", set()];
            return { head, called };
        `
            .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toContain("unpack"))
            .expectToMatchJsResult();
    });

    test("array union", () => {
        util.testFunction`
            const array: [string] | [] = ["bar"];
            let x: string;
            [x] = array;
            return x;
        `
            .tap(builder => expect(builder.getMainLuaCodeChunk()).toContain("unpack"))
            .expectToMatchJsResult();
    });
});
