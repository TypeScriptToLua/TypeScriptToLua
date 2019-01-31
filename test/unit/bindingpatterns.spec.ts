import { Expect, Test, TestCase, FocusTest, TestCases } from "alsatian";

import * as util from "../src/util";

const testCases = [
    ["{x}", "{x: true}", "x"],
    ["{x, y}", "{x: false, y: true}", "y"],
    ["{x: foo, y}", "{x: true, y: false}", "foo"],
    ["{x: foo, y: bar}", "{x: false, y: true}", "bar"],
    ["{x: {x, y}, z}", "{x: {x: true, y: false}, z: false}", "x"],
    ["{x: {x, y}, z}", "{x: {x: false, y: true}, z: false}", "y"],
    ["{x: {x, y}, z}", "{x: {x: false, y: false}, z: true}", "z"],
];

const testCasesDefault = [
    ["{x = true}", "{}", "x"],
    ["{x, y = true}", "{x: false}", "y"],
];

export class BindingPatternTests {

    @TestCase("{x, y}, z", "{x: false, y: false}, true", "z")
    @TestCase("{x, y}, {z}", "{x: false, y: false}, {z: true}", "z")
    @TestCases(testCases)
    @TestCases(testCasesDefault)
    @Test("Object bindings in functions")
    public testObjectBindingPatternParameters(
        bindingString: string,
        objectString: string,
        returnVariable: string
    ): void {
        const result = util.transpileAndExecute(`
            function test(${bindingString}) {
                return ${returnVariable};
            }
            return test(${objectString});
        `);
        Expect(result).toBe(true);
    }

    @TestCases(testCases)
    @TestCases(testCasesDefault)
    public testObjectBindingPatternDeclarations(
        bindingString: string,
        objectString: string,
        returnVariable: string
    ): void {
        const result = util.transpileAndExecute(`
            let ${bindingString} = ${objectString};
            return ${returnVariable};
        `);
        Expect(result).toBe(true);
    }

    @TestCases(testCases)
    @Test("Object bindings with call expressions")
    public testObjectBindingCallExpressions(
        bindingString: string,
        objectString: string,
        returnVariable: string
    ): void {
        const result = util.transpileAndExecute(`
            function call() {
                return ${objectString};
            }
            let ${bindingString} = call();
            return ${returnVariable};
        `);
        Expect(result).toBe(true);
    }

}