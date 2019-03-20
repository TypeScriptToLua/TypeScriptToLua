import { Expect, Test, TestCase, TestCases } from "alsatian";
import { TranspileError } from "../../src/TranspileError";

import * as util from "../src/util";
import { TSTLErrors } from "../../src/TSTLErrors";
const fs = require("fs");

interface TestFunction {
    value: string;
    definition?: string;
}

const selfTestFunctions: TestFunction[] = [
    {
        value: "selfFunc",
        definition: `let selfFunc: {(this: any, s: string): string} = function(s) { return s; };`,
    },
    {
        value: "selfLambda",
        definition: `let selfLambda: (this: any, s: string) => string = s => s;`,
    },
    {
        value: "anonFunc",
        definition: `let anonFunc: {(s: string): string} = function(s) { return s; };`,
    },
    {
        value: "anonLambda",
        definition: `let anonLambda: (s: string) => string = s => s;`,
    },
    {
        value: "methodClass.method",
        definition: `class MethodClass { method(this: any, s: string): string { return s; } }
            const methodClass = new MethodClass();`,
    },
    {
        value: "anonMethodClass.anonMethod",
        definition: `class AnonMethodClass { anonMethod(s: string): string { return s; } }
            const anonMethodClass = new AnonMethodClass();`,
    },
    {
        value: "funcPropClass.funcProp",
        definition: `class FuncPropClass { funcProp: (this: any, s: string) => string = s => s; }
            const funcPropClass = new FuncPropClass();`,
    },
    {
        value: "anonFuncPropClass.anonFuncProp",
        definition: `class AnonFuncPropClass { anonFuncProp: (s: string) => string = s => s; }
            const anonFuncPropClass = new AnonFuncPropClass();`,
    },
    {
        value: "StaticMethodClass.staticMethod",
        definition: `class StaticMethodClass {
                static staticMethod(this: any, s: string): string { return s; }
            }`,
    },
    {
        value: "AnonStaticMethodClass.anonStaticMethod",
        definition: `class AnonStaticMethodClass { static anonStaticMethod(s: string): string { return s; } }`,
    },
    {
        value: "StaticFuncPropClass.staticFuncProp",
        definition: `class StaticFuncPropClass {
                static staticFuncProp: (this: any, s: string) => string = s => s;
            }`,
    },
    {
        value: "AnonStaticFuncPropClass.anonStaticFuncProp",
        definition: `class AnonStaticFuncPropClass {
                static anonStaticFuncProp: (s: string) => string = s => s;
            }`,
    },
    {
        value: "FuncNs.nsFunc",
        definition: `namespace FuncNs { export function nsFunc(s: string) { return s; } }`,
    },
    {
        value: "FuncNestedNs.NestedNs.nestedNsFunc",
        definition: `namespace FuncNestedNs {
                export namespace NestedNs { export function nestedNsFunc(s: string) { return s; } }
            }`,
    },
    {
        value: "LambdaNs.nsLambda",
        definition: `namespace LambdaNs {
                export let nsLambda: (s: string) => string = s => s;
            }`,
    },
    {
        value: "LambdaNestedNs.NestedNs.nestedNsLambda",
        definition: `namespace LambdaNestedNs {
                export namespace NestedNs { export let nestedNsLambda: (s: string) => string = s => s }
            }`,
    },
    {
        value: "methodInterface.method",
        definition: `interface MethodInterface { method(this: any, s: string): string; }
            const methodInterface: MethodInterface = { method: function(this: any, s: string): string { return s; } }`,
    },
    {
        value: "anonMethodInterface.anonMethod",
        definition: `interface AnonMethodInterface { anonMethod(s: string): string; }
            const anonMethodInterface: AnonMethodInterface = {
                anonMethod: function(this: any, s: string): string { return s; }
            };`,
    },
    {
        value: "funcPropInterface.funcProp",
        definition: `interface FuncPropInterface { funcProp: (this: any, s: string) => string; }
            const funcPropInterface: FuncPropInterface = { funcProp: function(this: any, s: string) { return s; } };`,
    },
    {
        value: "anonFuncPropInterface.anonFuncProp",
        definition: `interface AnonFuncPropInterface { anonFuncProp: (s: string) => string; }
            const anonFuncPropInterface: AnonFuncPropInterface = { anonFuncProp: (s: string): string => s };`,
    },
    {
        value: "anonMethodClassInNoSelfNs.method",
        definition: `/** @noSelf */ namespace AnonMethodClassInNoSelfNs {
                export class MethodClass {
                    method(s: string): string { return s; }
                }
            }
            const anonMethodClassInNoSelfNs = new AnonMethodClassInNoSelfNs.MethodClass();`,
    },
    {
        value: "anonMethodInterfaceInNoSelfNs.method",
        definition: `/** @noSelf */ namespace AnonMethodInterfaceInNoSelfNs {
                export interface MethodInterface {
                    method(s: string): string;
                }
            }
            const anonMethodInterfaceInNoSelfNs: AnonMethodInterfaceInNoSelfNs.MethodInterface = {
                method: function(s: string): string { return s; }
            };`,
    },
    {
        value: "anonFunctionNestedInNoSelfClass",
        definition: `/** @noSelf */ class AnonFunctionNestedInNoSelfClass {
            method() { return function(s: string) { return s; } }
        }
        const anonFunctionNestedInNoSelfClass = (new AnonFunctionNestedInNoSelfClass).method();`,
    },
];

const noSelfTestFunctions: TestFunction[] = [
    {
        value: "voidFunc",
        definition: `let voidFunc: {(this: void, s: string): string} = function(s) { return s; };`,
    },
    {
        value: "voidLambda",
        definition: `let voidLambda: (this: void, s: string) => string = s => s;`,
    },
    {
        value: "voidMethodClass.voidMethod",
        definition: `class VoidMethodClass {
                voidMethod(this: void, s: string): string { return s; }
            }
            const voidMethodClass = new VoidMethodClass();`,
    },
    {
        value: "voidFuncPropClass.voidFuncProp",
        definition: `class VoidFuncPropClass {
                voidFuncProp: (this: void, s: string) => string = s => s;
            }
            const voidFuncPropClass = new VoidFuncPropClass();`,
    },
    {
        value: "StaticVoidMethodClass.staticVoidMethod",
        definition: `class StaticVoidMethodClass {
                static staticVoidMethod(this: void, s: string): string { return s; }
            }`,
    },
    {
        value: "StaticVoidFuncPropClass.staticVoidFuncProp",
        definition: `class StaticVoidFuncPropClass {
                static staticVoidFuncProp: (this: void, s: string) => string = s => s;
            }`,
    },
    {
        value: "NoSelfFuncNs.noSelfNsFunc",
        definition: `/** @noSelf */ namespace NoSelfFuncNs { export function noSelfNsFunc(s: string) { return s; } }`,
    },
    {
        value: "NoSelfFuncNestedNs.NestedNs.noSelfNestedNsFunc",
        definition: `/** @noSelf */ namespace NoSelfFuncNestedNs {
                export namespace NestedNs { export function noSelfNestedNsFunc(s: string) { return s; } }
            }`,
    },
    {
        value: "NoSelfLambdaNs.noSelfNsLambda",
        definition: `/** @noSelf */ namespace NoSelfLambdaNs {
                export let noSelfNsLambda: (s: string) => string = s => s;
            }`,
    },
    {
        value: "NoSelfLambdaNestedNs.NestedNs.noSelfNestedNsLambda",
        definition: `/** @noSelf */ namespace NoSelfLambdaNestedNs {
                export namespace NestedNs { export let noSelfNestedNsLambda: (s: string) => string = s => s }
            }`,
    },
    {
        value: "noSelfMethodClass.noSelfMethod",
        definition: `/** @noSelf */ class NoSelfMethodClass { noSelfMethod(s: string): string { return s; } }
            const noSelfMethodClass = new NoSelfMethodClass();`,
    },
    {
        value: "NoSelfStaticMethodClass.noSelfStaticMethod",
        definition: `/** @noSelf */ class NoSelfStaticMethodClass {
                static noSelfStaticMethod(s: string): string { return s; }
            }`,
    },
    {
        value: "noSelfFuncPropClass.noSelfFuncProp",
        definition: `/** @noSelf */ class NoSelfFuncPropClass { noSelfFuncProp: (s: string) => string = s => s; }
            const noSelfFuncPropClass = new NoSelfFuncPropClass();`,
    },
    {
        value: "NoSelfStaticFuncPropClass.noSelfStaticFuncProp",
        definition: `/** @noSelf */ class NoSelfStaticFuncPropClass {
                static noSelfStaticFuncProp: (s: string) => string  = s => s;
            }`,
    },
    {
        value: "voidMethodInterface.voidMethod",
        definition: `interface VoidMethodInterface {
                voidMethod(this: void, s: string): string;
            }
            const voidMethodInterface: VoidMethodInterface = {
                voidMethod(this: void, s: string): string { return s; }
            };`,
    },
    {
        value: "voidFuncPropInterface.voidFuncProp",
        definition: `interface VoidFuncPropInterface {
                voidFuncProp: (this: void, s: string) => string;
            }
            const voidFuncPropInterface: VoidFuncPropInterface = {
                voidFuncProp: function(this: void, s: string): string { return s; }
            };`,
    },
    {
        value: "noSelfMethodInterface.noSelfMethod",
        definition: `/** @noSelf */ interface NoSelfMethodInterface { noSelfMethod(s: string): string; }
            const noSelfMethodInterface: NoSelfMethodInterface = {
                noSelfMethod: function(s: string): string { return s; }
            };`,
    },
    {
        value: "noSelfFuncPropInterface.noSelfFuncProp",
        definition: `/** @noSelf */ interface NoSelfFuncPropInterface { noSelfFuncProp(s: string): string; }
            const noSelfFuncPropInterface: NoSelfFuncPropInterface = {
                noSelfFuncProp: (s: string): string => s
            };`,
    },
    {
        value: "noSelfMethodClassExpression.noSelfMethod",
        definition: `/** @noSelf */ const NoSelfMethodClassExpression = class {
                noSelfMethod(s: string): string { return s; }
            }
            const noSelfMethodClassExpression = new NoSelfMethodClassExpression();`,
    },
    {
        value: "anonFunctionNestedInClassInNoSelfNs",
        definition: `/** @noSelf */ namespace AnonFunctionNestedInClassInNoSelfNs {
            export class AnonFunctionNestedInClass {
                method() { return function(s: string) { return s; } }
            }
        }
        const anonFunctionNestedInClassInNoSelfNs =
            (new AnonFunctionNestedInClassInNoSelfNs.AnonFunctionNestedInClass).method();`,
    },
];

const noSelfInFileTestFunctions: TestFunction[] = [
    {
        value: "noSelfInFileFunc",
        definition: `/** @noSelfInFile */ let noSelfInFileFunc: {(s: string): string} = function(s) { return s; };`,
    },
    {
        value: "noSelfInFileLambda",
        definition: `/** @noSelfInFile */ let noSelfInFileLambda: (s: string) => string = s => s;`,
    },
    {
        value: "NoSelfInFileFuncNs.noSelfInFileNsFunc",
        definition: `/** @noSelfInFile */ namespace NoSelfInFileFuncNs {
                export function noSelfInFileNsFunc(s: string) { return s; }
            }`,
    },
    {
        value: "NoSelfInFileLambdaNs.noSelfInFileNsLambda",
        definition: `/** @noSelfInFile */ namespace NoSelfInFileLambdaNs {
                export let noSelfInFileNsLambda: (s: string) => string = s => s;
            }`,
    },
    {
        value: "noSelfInFileFuncNestedInClass",
        definition: `/** @noSelfInFile */ class NoSelfInFileFuncNestedInClass {
            method() { return function(s: string) { return s; } }
        }
        const noSelfInFileFuncNestedInClass = (new NoSelfInFileFuncNestedInClass).method();`,
    },
];

const anonTestFunctionExpressions: TestFunction[] = [
    {value: `s => s`},
    {value: `(s => s)`},
    {value: `function(s) { return s; }`},
    {value: `(function(s) { return s; })`},
];

const selfTestFunctionExpressions: TestFunction[] = [
    {value: `function(this: any, s) { return s; }`},
    {value: `(function(this: any, s) { return s; })`},
];

const noSelfTestFunctionExpressions: TestFunction[] = [
    {value: `function(this: void, s) { return s; }`},
    {value: `(function(this: void, s) { return s; })`},
];

const anonTestFunctionType = "(s: string) => string";
const selfTestFunctionType = "(this: any, s: string) => string";
const noSelfTestFunctionType = "(this: void, s: string) => string";

type TestFunctionCast = [
    /*testFunction: */TestFunction,
    /*castedFunction: */string,
    /*isSelfConversion?: */boolean?
];
const validTestFunctionCasts: TestFunctionCast[] = [
    [selfTestFunctions[0], `<${anonTestFunctionType}>(${selfTestFunctions[0].value})`],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${anonTestFunctionType})`],
    [selfTestFunctions[0], `<${selfTestFunctionType}>(${selfTestFunctions[0].value})`],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${selfTestFunctionType})`],
    [noSelfTestFunctions[0], `<${noSelfTestFunctionType}>(${noSelfTestFunctions[0].value})`],
    [noSelfTestFunctions[0], `(${noSelfTestFunctions[0].value}) as (${noSelfTestFunctionType})`],
    [noSelfInFileTestFunctions[0], `<${anonTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`],
    [noSelfInFileTestFunctions[0], `(${noSelfInFileTestFunctions[0].value}) as (${anonTestFunctionType})`],
    [noSelfInFileTestFunctions[0], `<${noSelfTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`],
    [noSelfInFileTestFunctions[0], `(${noSelfInFileTestFunctions[0].value}) as (${noSelfTestFunctionType})`],
];
const invalidTestFunctionCasts: TestFunctionCast[] = [
    [noSelfTestFunctions[0], `<${anonTestFunctionType}>(${noSelfTestFunctions[0].value})`, false],
    [noSelfTestFunctions[0], `(${noSelfTestFunctions[0].value}) as (${anonTestFunctionType})`, false],
    [noSelfTestFunctions[0], `<${selfTestFunctionType}>(${noSelfTestFunctions[0].value})`, false],
    [noSelfTestFunctions[0], `(${noSelfTestFunctions[0].value}) as (${selfTestFunctionType})`, false],
    [noSelfInFileTestFunctions[0], `<${selfTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`, false],
    [noSelfInFileTestFunctions[0], `(${noSelfInFileTestFunctions[0].value}) as (${selfTestFunctionType})`, false],
    [selfTestFunctions[0], `<${noSelfTestFunctionType}>(${selfTestFunctions[0].value})`, true],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${noSelfTestFunctionType})`, true],
];

type TestFunctionAssignment = [
    /*testFunction: */TestFunction,
    /*functionType: */string,
    /*isSelfConversion?: */boolean?
];
const validTestFunctionAssignments: TestFunctionAssignment[] = [
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
    ...noSelfInFileTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...noSelfInFileTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
    ...anonTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...anonTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...anonTestFunctionExpressions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
];
const invalidTestFunctionAssignments: TestFunctionAssignment[] = [
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType, false]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType, true]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
    ...noSelfInFileTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType, false]),
    ...noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType, true]),
    ...noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
];

export class AssignmentTests {

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1, 2, 3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"}`)
    @Test("Const assignment")
    public constAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`const myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1, 2, 3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"}`)
    @Test("Let assignment")
    public letAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`let myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1, 2, 3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"}`)
    @Test("Var assignment")
    public varAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`var myvar = ${inp};`);
        Expect(lua).toBe(`myvar = ${out};`);
    }

    @TestCase("var myvar;")
    @TestCase("let myvar;")
    @TestCase("const myvar = null;")
    @TestCase("const myvar = undefined;")
    @Test("Null assignments")
    public nullAssignment(declaration: string): void {
        const result = util.transpileAndExecute(declaration + " return myvar;");
        Expect(result).toBe(undefined);
    }

    @TestCase(["a", "b"], ["e", "f"])
    @TestCase(["a", "b"], ["e", "f", "g"])
    @TestCase(["a", "b", "c"], ["e", "f", "g"])
    @Test("Binding pattern assignment")
    public bindingPattern(input: string[], values: string[]): void {
        const pattern = input.join(",");
        const initializer = values.map(v => `"${v}"`).join(",");

        const tsCode = `const [${pattern}] = [${initializer}]; return [${pattern}].join("-");`;
        const result = util.transpileAndExecute(tsCode);

        Expect(result).toBe(values.slice(0, input.length).join("-"));
    }

    @Test("Ellipsis binding pattern")
    public ellipsisBindingPattern(): void {
        Expect(() => util.transpileString("let [a,b,...c] = [1,2,3];"))
            .toThrowError(Error, "Ellipsis destruction is not allowed.");
    }

    @Test("Tuple Assignment")
    public tupleAssignment(): void {
        const code = `function abc(): [number, number] { return [1, 2]; };
                      let t: [number, number] = abc();
                      return t[0] + t[1];`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(3);
    }

    @Test("TupleReturn assignment")
    public tupleReturnFunction(): void {
        const code = `/** @tupleReturn */\n`
                   + `declare function abc(this: void): number[]\n`
                   + `let [a,b] = abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a, b = abc();");
    }

    @Test("TupleReturn Single assignment")
    public tupleReturnSingleAssignment(): void {
        const code = `/** @tupleReturn */\n`
                   + `declare function abc(this: void): [number, string];\n`
                   + `let a = abc();`
                   + `a = abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a = ({abc()});\na = ({abc()});");
    }

    @Test("TupleReturn interface assignment")
    public tupleReturnInterface(): void {
        const code = `interface def {\n`
                   + `/** @tupleReturn */\n`
                   + `abc();\n`
                   + `} declare const jkl : def;\n`
                   + `let [a,b] = jkl.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a, b = jkl:abc();");
    }

    @Test("TupleReturn namespace assignment")
    public tupleReturnNameSpace(): void {
        const code = `declare namespace def {\n`
                   + `/** @tupleReturn */\n`
                   + `function abc(this: void) {}\n`
                   + `}\n`
                   + `let [a,b] = def.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a, b = def.abc();");
    }

    @Test("TupleReturn method assignment")
    public tupleReturnMethod(): void {
        const code = `declare class def {\n`
                   + `/** @tupleReturn */\n`
                   + `abc() { return [1,2,3]; }\n`
                   + `} const jkl = new def();\n`
                   + `let [a,b] = jkl.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local jkl = def.new();\nlocal a, b = jkl:abc();");
    }

    @Test("TupleReturn functional")
    public tupleReturnFunctional(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const [a, b] = abc();
        return b + a;`;

        const result = util.transpileAndExecute(code);

        Expect(result).toBe("a3");
    }

    @Test("TupleReturn single")
    public tupleReturnSingle(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const res = abc();
        return res.length`;

        const result = util.transpileAndExecute(code);

        Expect(result).toBe(2);
    }

    @Test("TupleReturn in expression")
    public tupleReturnInExpression(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        return abc()[1] + abc()[0];`;

        const result = util.transpileAndExecute(code);

        Expect(result).toBe("a3");
    }

    @TestCase("and")
    @TestCase("local")
    @TestCase("nil")
    @TestCase("not")
    @TestCase("or")
    @TestCase("repeat")
    @TestCase("then")
    @TestCase("until")
    @Test("Keyword identifier error")
    public keywordIdentifierError(identifier: string): void {
        Expect(() => util.transpileString(`const ${identifier} = 3;`))
            .toThrowError(TranspileError, `Cannot use Lua keyword ${identifier} as identifier.`);
    }

    @TestCases(validTestFunctionAssignments)
    @Test("Valid function variable declaration")
    public validFunctionDeclaration(testFunction: TestFunction, functionType: string): void {
        const code =
            `const fn: ${functionType} = ${testFunction.value};
            return fn("foobar");`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(validTestFunctionAssignments)
    @Test("Valid function assignment")
    public validFunctionAssignment(testFunction: TestFunction, functionType: string): void {
        const code =
            `let fn: ${functionType};
            fn = ${testFunction.value};
            return fn("foobar");`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionAssignments)
    @Test("Invalid function variable declaration")
    public invalidFunctionDeclaration(testFunction: TestFunction, functionType: string, isSelfConversion: boolean)
        : void
    {
        const code =
            `${testFunction.definition || ""}
            const fn: ${functionType} = ${testFunction.value};`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @TestCases(invalidTestFunctionAssignments)
    @Test("Invalid function assignment")
    public invalidFunctionAssignment(testFunction: TestFunction, functionType: string, isSelfConversion: boolean)
        : void
    {
        const code =
            `${testFunction.definition || ""}
            let fn: ${functionType};
            fn = ${testFunction.value};`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @TestCases(validTestFunctionCasts)
    @Test("Valid function assignment with cast")
    public validFunctionAssignmentWithCast(testFunction: TestFunction, castedFunction: string): void {
        const code =
            `let fn: typeof ${testFunction.value};
            fn = ${castedFunction};
            return fn("foobar");`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionCasts)
    @Test("Invalid function assignment with cast")
    public invalidFunctionAssignmentWithCast(
        testFunction: TestFunction,
        castedFunction: string,
        isSelfConversion: boolean
    ): void {
        const code =
            `${testFunction.definition || ""}
            let fn: typeof ${testFunction.value};
            fn = ${castedFunction};`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @TestCases(validTestFunctionAssignments)
    @Test("Valid function argument")
    public validFunctionArgument(testFunction: TestFunction, functionType: string): void {
        const code =
            `function takesFunction(fn: ${functionType}) {
                return fn("foobar");
            }
            return takesFunction(${testFunction.value});`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionAssignments)
    @Test("Invalid function argument")
    public invalidFunctionArgument(testFunction: TestFunction, functionType: string, isSelfConversion: boolean)
        : void
    {
        const code =
            `${testFunction.definition || ""}
            declare function takesFunction(fn: ${functionType});
            takesFunction(${testFunction.value});`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "fn")
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn");
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @Test("Valid lua lib function argument")
    public validLuaLibFunctionArgument(): void {
        const code =
            `let result = "";
            function foo(this: any, value: string) { result += value; }
            const a = ['foo', 'bar'];
            a.forEach(foo);
            return result;`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("Invalid lua lib function argument")
    public invalidLuaLibFunctionArgument(testFunction: TestFunction, functionType: string, isSelfConversion: boolean)
        : void
    {
        const code =
            `declare function foo(this: void, value: string): void;
            declare const a: string[];
            a.forEach(foo);`;
        const err = TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "callbackfn");
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @TestCases(validTestFunctionCasts)
    @Test("Valid function argument with cast")
    public validFunctionArgumentWithCast(testFunction: TestFunction, castedFunction: string): void {
        const code =
            `function takesFunction(fn: typeof ${testFunction.value}) {
                return fn("foobar");
            }
            return takesFunction(${castedFunction});`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionCasts)
    @Test("Invalid function argument with cast")
    public invalidFunctionArgumentWithCast(
        testFunction: TestFunction,
        castedFunction: string,
        isSelfConversion: boolean
    ): void
    {
        const code =
            `${testFunction.definition || ""}
            declare function takesFunction(fn: typeof ${testFunction.value});
            takesFunction(${castedFunction});`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "fn")
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn");
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    // TODO: Fix function expression inference with generic types. The following should work, but doesn't:
    //     function takesFunction<T extends (this: void, s: string) => string>(fn: T) { ... }
    //     takesFunction(s => s); // Error: cannot convert method to function
    // @TestCases(validTestFunctionAssignments) // Use this instead of other TestCases when fixed
    @TestCases(selfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]))
    @TestCases(selfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]))
    @TestCases(noSelfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]))
    @TestCases(selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]))
    @TestCases(selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]))
    @TestCases(noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]))
    @Test("Valid function generic argument")
    public validFunctionGenericArgument(testFunction: TestFunction, functionType: string): void {
        const code =
            `function takesFunction<T extends ${functionType}>(fn: T) {
                return fn("foobar");
            }
            return takesFunction(${testFunction.value});`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionAssignments)
    @Test("Invalid function generic argument")
    public invalidFunctionGenericArgument(testFunction: TestFunction, functionType: string, isSelfConversion: boolean)
        : void
    {
        const code =
            `${testFunction.definition || ""}
            declare function takesFunction<T extends ${functionType}>(fn: T);
            takesFunction(${testFunction.value});`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "fn")
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn");
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @TestCases(anonTestFunctionExpressions.map(f => [f, "0", "'foobar'"]))
    @TestCases(selfTestFunctionExpressions.map(f => [f, "0", "'foobar'"]))
    @TestCases(noSelfTestFunctionExpressions.map(f => [f, "'foobar'"]))
    @Test("Valid function expression argument with no signature")
    public validFunctionExpressionArgumentNoSignature(testFunction: TestFunction, ...args: string[]): void {
        const code =
            `const takesFunction: any = (fn: (this: void, ...args: any[]) => any, ...args: any[]) => {
                return fn(...args);
            }
            return takesFunction(${testFunction.value}, ${args.join(", ")});`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(validTestFunctionAssignments)
    @Test("Valid function return")
    public validFunctionReturn(testFunction: TestFunction, functionType: string): void {
        const code =
            `function returnsFunction(): ${functionType} {
                return ${testFunction.value};
            }
            const fn = returnsFunction();
            return fn("foobar");`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionAssignments)
    @Test("Invalid function return")
    public invalidFunctionReturn(testFunction: TestFunction, functionType: string, isSelfConversion: boolean): void {
        const code =
            `${testFunction.definition || ""}
            function returnsFunction(): ${functionType} {
                return ${testFunction.value};
            }`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @TestCases(validTestFunctionCasts)
    @Test("Valid function return with cast")
    public validFunctionReturnWithCast(testFunction: TestFunction, castedFunction: string): void {
        const code =
            `function returnsFunction(): typeof ${testFunction.value} {
                return ${castedFunction};
            }
            const fn = returnsFunction();
            return fn("foobar");`;
        Expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
    }

    @TestCases(invalidTestFunctionCasts)
    @Test("Invalid function return with cast")
    public invalidFunctionReturnWithCast(
        testFunction: TestFunction,
        castedFunction: string,
        isSelfConversion: boolean
    ): void
    {
        const code =
            `${testFunction.definition || ""}
            function returnsFunction(): typeof ${testFunction.value} {
                return ${castedFunction};
            }`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        Expect(() => util.transpileString(code, undefined, false)).toThrowError(TranspileError, err.message);
    }

    @Test("Interface method assignment")
    public interfaceMethodAssignment(): void {
        const code = `class Foo {
                          method(s: string): string { return s + "+method"; }
                          lambdaProp: (s: string) => string = s => s + "+lambdaProp";
                      }
                      interface IFoo {
                          method: (s: string) => string;
                          lambdaProp(s: string): string;
                      }
                      const foo: IFoo = new Foo();
                      return foo.method("foo") + "|" + foo.lambdaProp("bar");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo+method|bar+lambdaProp");
    }

    @Test("Valid function tuple assignment")
    public validFunctionTupleAssignment(): void {
        const code = `interface Func { (this: void, s: string): string; }
                      function getTuple(): [number, Func] { return [1, s => s]; }
                      let [i, f]: [number, Func] = getTuple();
                      return f("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Invalid function tuple assignment")
    public invalidFunctionTupleAssignment(): void {
        const code = `interface Func { (this: void, s: string): string; }
                      interface Meth { (this: {}, s: string): string; }
                      declare function getTuple(): [number, Meth];
                      let [i, f]: [number, Func] = getTuple();`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined).message
        );
    }

    @Test("Valid method tuple assignment")
    public validMethodTupleAssignment(): void {
        const code = `interface Foo { method(s: string): string; }
                      interface Meth { (this: Foo, s: string): string; }
                      let meth: Meth = s => s;
                      function getTuple(): [number, Meth] { return [1, meth]; }
                      let [i, f]: [number, Meth] = getTuple();
                      let foo: Foo = {method: f};
                      return foo.method("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Invalid method tuple assignment")
    public invalidMethodTupleAssignment(): void {
        const code = `interface Func { (this: void, s: string): string; }
                      interface Meth { (this: {}, s: string): string; }
                      declare function getTuple(): [number, Func];
                      let [i, f]: [number, Meth] = getTuple();`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            TSTLErrors.UnsupportedSelfFunctionConversion(undefined).message
        );
    }

    @Test("Valid interface method assignment")
    public validInterfaceMethodAssignment(): void {
        const code = `interface A { fn(this: void, s: string): string; }
                      interface B { fn(this: void, s: string): string; }
                      const a: A = { fn(this: void, s) { return s; } };
                      const b: B = a;
                      return b.fn("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Invalid interface method assignment")
    public invalidInterfaceMethodAssignment(): void {
        const code = `interface A { fn(s: string): string; }
                      interface B { fn(this: void, s: string): string; }
                      declare const a: A;
                      const b: B = a;`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn").message
        );
    }

    @TestCase("(this: any, s: string) => string", ["foo"], "foobar")
    @TestCase("{(this: any, s: string): string}", ["foo"], "foobar")
    @TestCase("(this: any, s1: string, s2: string) => string", ["foo", "baz"], "foobaz")
    @TestCase("{(this: any, s1: string, s2: string): string}", ["foo", "baz"], "foobaz")
    @Test("Valid function overload assignment")
    public validFunctionOverloadAssignment(assignType: string, args: string[], expectResult: string): void {
        const code = `interface O {
                          (s1: string, s2: string): string;
                          (s: string): string;
                      }
                      const o: O = (s1: string, s2?: string) => s1 + (s2 || "bar");
                      let f: ${assignType} = o;
                      return f(${args.map(a => "\"" + a + "\"").join(", ")});`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("(this: void, s: string) => string")
    @TestCase("(this: void, s1: string, s2: string) => string")
    @TestCase("{(this: void, s: string): string}")
    @TestCase("{(this: any, s1: string, s2: string): string}")
    @Test("Invalid function overload assignment")
    public invalidFunctionOverloadAssignment(assignType: string): void {
        const code = `interface O {
                          (this: any, s1: string, s2: string): string;
                          (this: void, s: string): string;
                      }
                      declare const o: O;
                      let f: ${assignType} = o;`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            TSTLErrors.UnsupportedOverloadAssignment(undefined).message
        );
    }

    @TestCase("noSelf")
    @TestCase("noSelfInFile")
    @Test("noSelf function method argument")
    public noSelfFunctionMethodArgument(noSelfTag: string): void {
        const header =
            `/** @${noSelfTag} */ namespace NS {
                export class C {
                    method(fn: (s: string) => string) { return fn("foo"); }
                }
            }
            function foo(this: void, s: string) { return s; }`;
        const code =
            `const c = new NS.C();
            return c.method(foo);`;
        Expect(util.transpileAndExecute(code, undefined, undefined, header, false)).toBe("foo");
    }

    @TestCase("(this: void, s: string) => string")
    @TestCase("(this: any, s: string) => string")
    @TestCase("(s: string) => string")
    @Test("Function expression type inference in binary operator")
    public functionExpressionTypeInferenceInBinaryOp(funcType: string): void {
        const header = `declare const undefinedFunc: ${funcType};`;
        const code =
            `let func: ${funcType} = s => s;
            func = undefinedFunc || (s => s);
            return func("foo");`;
        Expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe("foo");
    }

    @TestCase("s => s")
    @TestCase("(s => s)")
    @TestCase("function(s) { return s; }")
    @TestCase("(function(s) { return s; })")
    @Test("Function expression type inference in class")
    public functionExpressionTypeInferenceInClass(funcExp: string): void {
        const code =
            `class Foo {
                func: (this: void, s: string) => string = ${funcExp};
                method: (s: string) => string = ${funcExp};
                static staticFunc: (this: void, s: string) => string = ${funcExp};
                static staticMethod: (s: string) => string = ${funcExp};
            }
            const foo = new Foo();
            return foo.func("a") + foo.method("b") + Foo.staticFunc("c") + Foo.staticMethod("d");`;
        Expect(util.transpileAndExecute(code)).toBe("abcd");
    }

    @TestCase("const foo: Foo", "s => s")
    @TestCase("const foo: Foo", "(s => s)")
    @TestCase("const foo: Foo", "function(s) { return s; }")
    @TestCase("const foo: Foo", "(function(s) { return s; })")
    @TestCase("let foo: Foo; foo", "s => s")
    @TestCase("let foo: Foo; foo", "(s => s)")
    @TestCase("let foo: Foo; foo", "function(s) { return s; }")
    @TestCase("let foo: Foo; foo", "(function(s) { return s; })")
    @Test("Function expression type inference in object literal")
    public functionExpressionTypeInferenceInObjectLiteral(assignTo: string, funcExp: string): void {
        const code =
            `interface Foo {
                func(this: void, s: string): string;
                method(this: this, s: string): string;
            }
            ${assignTo} = {func: ${funcExp}, method: ${funcExp}};
            return foo.method("foo") + foo.func("bar");`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @Test("Function expression type inference in object literal assigned to narrower type")
    public functionEXpressionTypeInferenceInObjectLiteralAssignedToNarrowerType(): void {
        const code =
            `let foo: {} = {bar: s => s};
            return (foo as {bar: (a: any) => any}).bar("foobar");`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @TestCase("const foo: Foo", "s => s")
    @TestCase("const foo: Foo", "(s => s)")
    @TestCase("const foo: Foo", "function(s) { return s; }")
    @TestCase("const foo: Foo", "(function(s) { return s; })")
    @TestCase("let foo: Foo; foo", "s => s")
    @TestCase("let foo: Foo; foo", "(s => s)")
    @TestCase("let foo: Foo; foo", "function(s) { return s; }")
    @TestCase("let foo: Foo; foo", "(function(s) { return s; })")
    @Test("Function expression type inference in object literal (generic key)")
    public functionExpressionTypeInferenceInObjectLiteralGenericKey(assignTo: string, funcExp: string): void {
        const code =
            `interface Foo {
                [f: string]: (this: void, s: string) => string;
            }
            ${assignTo} = {func: ${funcExp}};
            return foo.func("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "s => s")
    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "(s => s)")
    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "function(s) { return s; }")
    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "(function(s) { return s; })")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "s => s")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "(s => s)")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "function(s) { return s; }")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "(function(s) { return s; })")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "s => s")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "(s => s)")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "function(s) { return s; }")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "(function(s) { return s; })")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "s => s")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "(s => s)")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "function(s) { return s; }")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "(function(s) { return s; })")
    @Test("Function expression type inference in tuple")
    public functionExpressionTypeInferenceInTuple(
        assignTo: string,
        func: string,
        method: string,
        funcExp: string
    ): void
    {
        const code =
            `interface Foo {
                method(s: string): string;
            }
            interface Func {
                (this: void, s: string): string;
            }
            interface Method {
                (this: Foo, s: string): string;
            }
            ${assignTo} = [${funcExp}, ${funcExp}];
            const foo: Foo = {method: ${method}};
            return foo.method("foo") + ${func}("bar");`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @TestCase("const meths: Method[]", "meths[0]", "s => s")
    @TestCase("const meths: Method[]", "meths[0]", "(s => s)")
    @TestCase("const meths: Method[]", "meths[0]", "function(s) { return s; }")
    @TestCase("const meths: Method[]", "meths[0]", "(function(s) { return s; })")
    @TestCase("let meths: Method[]; meths", "meths[0]", "s => s")
    @TestCase("let meths: Method[]; meths", "meths[0]", "(s => s)")
    @TestCase("let meths: Method[]; meths", "meths[0]", "function(s) { return s; }")
    @TestCase("let meths: Method[]; meths", "meths[0]", "(function(s) { return s; })")
    @TestCase("const [meth]: Method[]", "meth", "s => s")
    @TestCase("const [meth]: Method[]", "meth", "(s => s)")
    @TestCase("const [meth]: Method[]", "meth", "function(s) { return s; }")
    @TestCase("const [meth]: Method[]", "meth", "(function(s) { return s; })")
    @TestCase("let meth: Method; [meth]", "meth", "s => s")
    @TestCase("let meth: Method; [meth]", "meth", "(s => s)")
    @TestCase("let meth: Method; [meth]", "meth", "function(s) { return s; }")
    @TestCase("let meth: Method; [meth]", "meth", "(function(s) { return s; })")
    @Test("Function expression type inference in array")
    public functionExpressionTypeInferenceInArray(assignTo: string, method: string, funcExp: string): void {
        const code =
            `interface Foo {
                method(s: string): string;
            }
            interface Method {
                (this: Foo, s: string): string;
            }
            ${assignTo} = [${funcExp}];
            const foo: Foo = {method: ${method}};
            return foo.method("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("(this: void, s: string) => string", "s => s")
    @TestCase("(this: any, s: string) => string", "s => s")
    @TestCase("(s: string) => string", "s => s")
    @TestCase("(this: void, s: string) => string", "function(s) { return s; }")
    @TestCase("(this: any, s: string) => string", "function(s) { return s; }")
    @TestCase("(s: string) => string", "function(s) { return s; }")
    @Test("Function expression type inference in union")
    public functionExpressionTypeInferenceInUnion(funcType: string, funcExp: string): void {
        const code =
            `type U = string | number | (${funcType});
            const u: U = ${funcExp};
            return (u as ${funcType})("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("(this: void, s: string) => string", "s => s")
    @TestCase("(this: any, s: string) => string", "s => s")
    @TestCase("(s: string) => string", "s => s")
    @TestCase("(this: void, s: string) => string", "function(s) { return s; }")
    @TestCase("(this: any, s: string) => string", "function(s) { return s; }")
    @TestCase("(s: string) => string", "function(s) { return s; }")
    @Test("Function expression type inference in union tuple")
    public functionExpressionTypeInferenceInUnionTuple(funcType: string, funcExp: string): void {
        const code =
            `interface I { callback: ${funcType}; }
            let a: I[] | number = [{ callback: ${funcExp} }];
            return a[0].callback("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("(this: void, s: string) => string", "s => s")
    @TestCase("(this: any, s: string) => string", "s => s")
    @TestCase("(s: string) => string", "s => s")
    @TestCase("(this: void, s: string) => string", "function(s) { return s; }")
    @TestCase("(this: any, s: string) => string", "function(s) { return s; }")
    @TestCase("(s: string) => string", "function(s) { return s; }")
    @Test("Function expression type inference in as cast")
    public functionExpressionTypeInferenceInAsCast(funcType: string, funcExp: string): void {
        const code =
            `const fn: ${funcType} = (${funcExp}) as (${funcType});
            return fn("foo");`;
            console.log(code);
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("(this: void, s: string) => string", "s => s")
    @TestCase("(this: any, s: string) => string", "s => s")
    @TestCase("(s: string) => string", "s => s")
    @TestCase("(this: void, s: string) => string", "function(s) { return s; }")
    @TestCase("(this: any, s: string) => string", "function(s) { return s; }")
    @TestCase("(s: string) => string", "function(s) { return s; }")
    @Test("Function expression type inference in type assertion")
    public functionExpressionTypeInferenceInTypeAssert(funcType: string, funcExp: string): void {
        const code =
            `const fn: ${funcType} = <${funcType}>(${funcExp});
            return fn("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("(this: void, s: string) => string", "s => s")
    @TestCase("(this: any, s: string) => string", "s => s")
    @TestCase("(s: string) => string", "s => s")
    @TestCase("(this: void, s: string) => string", "function(s) { return s; }")
    @TestCase("(this: any, s: string) => string", "function(s) { return s; }")
    @TestCase("(s: string) => string", "function(s) { return s; }")
    @Test("Function expression type inference in constructor")
    public functionExpresssionTypeInferenceInConstructor(funcType: string, funcExp: string): void {
        const code =
            `class C {
                result: string;
                constructor(fn: (s: string) => string) { this.result = fn("foo"); }
            }
            const c = new C(s => s);
            return c.result;`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("String table access")
    public stringTableAccess(assignType: string): void {
        const code = `const dict : {[key:string]:any} = {};
                      dict["a b"] = 3;
                      return dict["a b"];`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(3);
    }

}
