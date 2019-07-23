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
    { bindingString: "[x = true, y = false]", objectString: "[undefined, undefined]", returnVariable: "x" },
    { bindingString: "[x = false, y = false]", objectString: "[false, true]", returnVariable: "y" },
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

const assignmentBindingPatterns = [
    { bindingString: "{x: obj.prop}", objectString: "{x: true}", returnVariable: "obj.prop" },
    {
        bindingString: "{x: obj.prop = true}",
        objectString: "{x: undefined}",
        returnVariable: "obj.prop",
    },
    { bindingString: "[{x: obj.prop}]", objectString: "[{x: true}]", returnVariable: "obj.prop" },
    {
        bindingString: "{obj: {prop: obj.prop}}",
        objectString: "{obj: {prop: true}}",
        returnVariable: "obj.prop",
    },
    { bindingString: "{x = true}", objectString: "{}", returnVariable: "x" },
    {
        bindingString: "{x: {[2 + 1]: y}}",
        objectString: "{x: {[2 + 1]: true}}",
        returnVariable: "y",
    },
];

test.each([...assignmentBindingPatterns, ...testCases])(
    "Binding pattern expressions (%p)",
    ({ bindingString, objectString, returnVariable }) => {
        const result = util.transpileAndExecute(`
            let x, y, z, foo, bar, obj: { prop: boolean };
            obj = { prop: false };
            (${bindingString} = ${objectString})
            return ${returnVariable};
        `);
        expect(result).toBe(true);
    }
);

test.each([...assignmentBindingPatterns, ...testCases])(
    "Binding patterns expressions pass conditional checks (%p)",
    ({ bindingString, objectString, returnVariable }) => {
        const result = util.transpileAndExecute(`
            let x, y, z, foo, bar, obj: { prop: boolean };
            obj = { prop: false };
            if (${bindingString} = ${objectString}) {
                return ${returnVariable};
            }
        `);
        expect(result).toBe(true);
    }
);

test.each([
    { bindingString: "{ x: x.prop = true } = {}", returnValue: "x.prop", expectedResult: true },
    {
        bindingString: "{ x: x.prop = true } = {}",
        returnValue: "typeof y === 'object'",
        expectedResult: true,
    },
])("Binding pattern assignment pass-through (%p)", ({ bindingString, returnValue, expectedResult }) => {
    const result = util.transpileAndExecute(`
            let x: any = {}, y: any = {};
            y = ${bindingString};
            return ${returnValue};
        `);
    expect(result).toBe(expectedResult);
});

test("Array binding pattern to assign array length (%p)", () => {
    const result = util.transpileAndExecute(`
            let x = [0, 1, 2];
            [x.length] = [0];
            return x.length;
        `);
    expect(result).toBe(0);
});

test("Nested array binding pattern to assign array length (%p)", () => {
    const result = util.transpileAndExecute(`
            let x = [0, 1, 2];
            [[x.length]] = [[0]];
            return x.length;
        `);
    expect(result).toBe(0);
});

test("Object binding pattern to assign array length (%p)", () => {
    const result = util.transpileAndExecute(`
            let x = [0, 1, 2];
            ({ x: x.length } = { x: 0 });
            return x.length;
        `);
    expect(result).toBe(0);
});

test("Nested object binding pattern to assign array length (%p)", () => {
    const result = util.transpileAndExecute(`
            let x = [0, 1, 2];
            ({ x: { x: x.length } } = { x: { x: 0 } });
            return x.length;
        `);
    expect(result).toBe(0);
});
