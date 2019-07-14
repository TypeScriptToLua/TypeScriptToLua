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

    { binding: "[x, y]", value: [false, true] },
    { binding: "[[x, y]]", value: [[false, true]] },
    { binding: "[x = true]", value: [false] },

    { binding: "{ x: [y, z] }", value: { x: [false, true] } },
    { binding: "{ x: [{ y }] }", value: { x: [{ y: true }] } },
    { binding: "{ x, y: [z = true] }", value: { x: false, y: [false] } },
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

test.each(testCases)("in exported variable declaration (%p)", ({ binding, value }) => {
    util.testModule`
        export const ${binding} = ${value};
    `.expectToMatchJsResult();
});
