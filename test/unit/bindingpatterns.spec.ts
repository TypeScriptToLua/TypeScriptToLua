import * as util from "../util";

const testCases = [
    { bindingString: "{x}", objectString: "{x: true}", returnVariable: "x" },
    { bindingString: "[x, y]", objectString: "[false, true]", returnVariable: "y" },
    { bindingString: "{x: [y, z]}", objectString: "{x: [false, true]}", returnVariable: "z" },
    { bindingString: "{x: [, z]}", objectString: "{x: [false, true]}", returnVariable: "z" },
    { bindingString: "{x: [{y}]}", objectString: "{x: [{y: true}]}", returnVariable: "y" },
    { bindingString: "[[y, z]]", objectString: "[[false, true]]", returnVariable: "z" },
    { bindingString: "{x, y}", objectString: "{x: false, y: true}", returnVariable: "y" },
    { bindingString: "{x: foo, y}", objectString: "{x: true, y: false}", returnVariable: "foo" },
    { bindingString: "{x: foo, y: bar}", objectString: "{x: false, y: true}", returnVariable: "bar" },
    { bindingString: "{x: {x, y}, z}", objectString: "{x: {x: true, y: false}, z: false}", returnVariable: "x" },
    { bindingString: "{x: {x, y}, z}", objectString: "{x: {x: false, y: true}, z: false}", returnVariable: "y" },
    { bindingString: "{x: {x, y}, z}", objectString: "{x: {x: false, y: false}, z: true}", returnVariable: "z" },
];

const testCasesDefault = [
    { bindingString: "{x = true}", objectString: "{}", returnVariable: "x" },
    { bindingString: "{x, y = true}", objectString: "{x: false}", returnVariable: "y" },
];

test.each([
    { bindingString: "{x, y}, z", objectString: "{x: false, y: false}, true", returnVariable: "z" },
    { bindingString: "{x, y}, {z}", objectString: "{x: false, y: false}, {z: true}", returnVariable: "z" },
    ...testCases,
    ...testCasesDefault,
])("Object bindings in functions (%p)", ({ bindingString, objectString, returnVariable }) => {
    const result = util.transpileAndExecute(`
        function test(${bindingString}) {
            return ${returnVariable};
        }
        return test(${objectString});
    `);
    expect(result).toBe(true);
});

test.each([...testCases, ...testCasesDefault])(
    "testBindingPatternDeclarations (%p)",
    ({ bindingString, objectString, returnVariable }) => {
        const result = util.transpileAndExecute(`
            let ${bindingString} = ${objectString};
            return ${returnVariable};
        `);
        expect(result).toBe(true);
    }
);

test.each([...testCases, ...testCasesDefault])(
    "testBindingPatternExportDeclarations (%p)",
    ({ bindingString, objectString, returnVariable }) => {
        const result = util.transpileExecuteAndReturnExport(
            `export const ${bindingString} = ${objectString};`,
            returnVariable
        );
        expect(result).toBe(true);
    }
);

test.each(testCases)(
    "Object bindings with call expressions (%p)",
    ({ bindingString, objectString, returnVariable }) => {
        const result = util.transpileAndExecute(`
            function call() {
                return ${objectString};
            }
            let ${bindingString} = call();
            return ${returnVariable};
        `);
        expect(result).toBe(true);
    }
);

test.each([
    { bindingString: "{x, y = true}", objectString: "{x: false, y: false}", returnVariable: "y" },
    { bindingString: "{x, y: [z = true]}", objectString: "{x: false, y: [false]}", returnVariable: "z" },
    { bindingString: "[x = true]", objectString: "[false]", returnVariable: "x" },
])("Binding patterns handle false correctly (%p)", ({ bindingString, objectString, returnVariable }) => {
    const result = util.transpileExecuteAndReturnExport(
        `export const ${bindingString} = ${objectString};`,
        returnVariable
    );
    expect(result).toBe(false);
});
