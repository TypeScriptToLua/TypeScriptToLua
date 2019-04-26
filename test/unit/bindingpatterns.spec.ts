import * as util from "../util";

const testCases = [
    { bindingString: "{x}", objectString: "{x: true}", returnVariable: "x", expectedResult: true },
    {
        bindingString: "[x, y]",
        objectString: "[false, true]",
        returnVariable: "y",
        expectedResult: true,
    },
    {
        bindingString: "{x: [y, z]}",
        objectString: "{x: [false, true]}",
        returnVariable: "z",
        expectedResult: true,
    },
    {
        bindingString: "{x: [, z]}",
        objectString: "{x: [false, true]}",
        returnVariable: "z",
        expectedResult: true,
    },
    {
        bindingString: "{x: [{y}]}",
        objectString: "{x: [{y: true}]}",
        returnVariable: "y",
        expectedResult: true,
    },
    {
        bindingString: "[[y, z]]",
        objectString: "[[false, true]]",
        returnVariable: "z",
        expectedResult: true,
    },
    {
        bindingString: "{x, y}",
        objectString: "{x: false, y: true}",
        returnVariable: "y",
        expectedResult: true,
    },
    {
        bindingString: "{x: foo, y}",
        objectString: "{x: true, y: false}",
        returnVariable: "foo",
        expectedResult: true,
    },
    {
        bindingString: "{x: foo, y: bar}",
        objectString: "{x: false, y: true}",
        returnVariable: "bar",
        expectedResult: true,
    },
    {
        bindingString: "{x: {x, y}, z}",
        objectString: "{x: {x: true, y: false}, z: false}",
        returnVariable: "x",
        expectedResult: true,
    },
    {
        bindingString: "{x: {x, y}, z}",
        objectString: "{x: {x: false, y: true}, z: false}",
        returnVariable: "y",
        expectedResult: true,
    },
    {
        bindingString: "{x: {x, y}, z}",
        objectString: "{x: {x: false, y: false}, z: true}",
        returnVariable: "z",
        expectedResult: true,
    },
];

const testCasesDefault = [
    { bindingString: "{x = true}", objectString: "{}", returnVariable: "x", expectedResult: true },
    {
        bindingString: "{x, y = true}",
        objectString: "{x: false}",
        returnVariable: "y",
        expectedResult: true,
    },
    {
        bindingString: "{x, y = true}",
        objectString: "{x: false, y: false}",
        returnVariable: "y",
        expectedResult: false,
    },
    {
        bindingString: "{x, y: [z = true]}",
        objectString: "{x: false, y: [false]}",
        returnVariable: "z",
        expectedResult: false,
    },
];

test.each([
    {
        bindingString: "{x, y}, z",
        objectString: "{x: false, y: false}, true",
        returnVariable: "z",
        expectedResult: true,
    },
    {
        bindingString: "{x, y}, {z}",
        objectString: "{x: false, y: false}, {z: true}",
        returnVariable: "z",
        expectedResult: true,
    },
    ...testCases,
    ...testCasesDefault,
])(
    "Object bindings in functions (%p)",
    ({ bindingString, objectString, returnVariable, expectedResult }) => {
        const result = util.transpileAndExecute(`
        function test(${bindingString}) {
            return ${returnVariable};
        }
        return test(${objectString});
    `);
        expect(result).toBe(expectedResult);
    },
);

test.each([...testCases, ...testCasesDefault])(
    "testBindingPatternDeclarations (%p)",
    ({ bindingString, objectString, returnVariable, expectedResult }) => {
        const result = util.transpileAndExecute(`
            let ${bindingString} = ${objectString};
            return ${returnVariable};
        `);
        expect(result).toBe(expectedResult);
    },
);

test.each([...testCases, ...testCasesDefault])(
    "testBindingPatternExportDeclarations (%p)",
    ({ bindingString, objectString, returnVariable, expectedResult }) => {
        const result = util.transpileExecuteAndReturnExport(
            `export const ${bindingString} = ${objectString};`,
            returnVariable,
        );
        expect(result).toBe(expectedResult);
    },
);

test.each([...testCases, ...testCasesDefault])(
    "Object bindings with call expressions (%p)",
    ({ bindingString, objectString, returnVariable, expectedResult }) => {
        const result = util.transpileAndExecute(`
            function call(): any {
                return ${objectString};
            }
            let ${bindingString} = call();
            return ${returnVariable};
        `);
        expect(result).toBe(expectedResult);
    },
);
