import { TranspileError } from "../../src/TranspileError";
import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

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
    { value: `s => s` },
    { value: `(s => s)` },
    { value: `function(s) { return s; }` },
    { value: `(function(s) { return s; })` },
];

const selfTestFunctionExpressions: TestFunction[] = [
    { value: `function(this: any, s) { return s; }` },
    { value: `(function(this: any, s) { return s; })` },
];

const noSelfTestFunctionExpressions: TestFunction[] = [
    { value: `function(this: void, s) { return s; }` },
    { value: `(function(this: void, s) { return s; })` },
];

const anonTestFunctionType = "(s: string) => string";
const selfTestFunctionType = "(this: any, s: string) => string";
const noSelfTestFunctionType = "(this: void, s: string) => string";

type TestFunctionCast = [
    /*testFunction: */ TestFunction,
    /*castedFunction: */ string,
    /*isSelfConversion?: */ boolean?
];
const validTestFunctionCasts: TestFunctionCast[] = [
    [selfTestFunctions[0], `<${anonTestFunctionType}>(${selfTestFunctions[0].value})`],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${anonTestFunctionType})`],
    [selfTestFunctions[0], `<${selfTestFunctionType}>(${selfTestFunctions[0].value})`],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${selfTestFunctionType})`],
    [noSelfTestFunctions[0], `<${noSelfTestFunctionType}>(${noSelfTestFunctions[0].value})`],
    [noSelfTestFunctions[0], `(${noSelfTestFunctions[0].value}) as (${noSelfTestFunctionType})`],
    [
        noSelfInFileTestFunctions[0],
        `<${anonTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`,
    ],
    [
        noSelfInFileTestFunctions[0],
        `(${noSelfInFileTestFunctions[0].value}) as (${anonTestFunctionType})`,
    ],
    [
        noSelfInFileTestFunctions[0],
        `<${noSelfTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`,
    ],
    [
        noSelfInFileTestFunctions[0],
        `(${noSelfInFileTestFunctions[0].value}) as (${noSelfTestFunctionType})`,
    ],
];
const invalidTestFunctionCasts: TestFunctionCast[] = [
    [noSelfTestFunctions[0], `<${anonTestFunctionType}>(${noSelfTestFunctions[0].value})`, false],
    [
        noSelfTestFunctions[0],
        `(${noSelfTestFunctions[0].value}) as (${anonTestFunctionType})`,
        false,
    ],
    [noSelfTestFunctions[0], `<${selfTestFunctionType}>(${noSelfTestFunctions[0].value})`, false],
    [
        noSelfTestFunctions[0],
        `(${noSelfTestFunctions[0].value}) as (${selfTestFunctionType})`,
        false,
    ],
    [
        noSelfInFileTestFunctions[0],
        `<${selfTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`,
        false,
    ],
    [
        noSelfInFileTestFunctions[0],
        `(${noSelfInFileTestFunctions[0].value}) as (${selfTestFunctionType})`,
        false,
    ],
    [selfTestFunctions[0], `<${noSelfTestFunctionType}>(${selfTestFunctions[0].value})`, true],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${noSelfTestFunctionType})`, true],
];

type TestFunctionAssignment = [
    /*testFunction: */ TestFunction,
    /*functionType: */ string,
    /*isSelfConversion?: */ boolean?
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
    ...noSelfTestFunctionExpressions.map(
        (f): TestFunctionAssignment => [f, noSelfTestFunctionType],
    ),
];
const invalidTestFunctionAssignments: TestFunctionAssignment[] = [
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType, false]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType, true]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
    ...noSelfInFileTestFunctions.map(
        (f): TestFunctionAssignment => [f, selfTestFunctionType, true],
    ),
    ...selfTestFunctionExpressions.map(
        (f): TestFunctionAssignment => [f, noSelfTestFunctionType, false],
    ),
    ...noSelfTestFunctionExpressions.map(
        (f): TestFunctionAssignment => [f, anonTestFunctionType, true],
    ),
    ...noSelfTestFunctionExpressions.map(
        (f): TestFunctionAssignment => [f, selfTestFunctionType, true],
    ),
];

test.each([
    { inp: `"abc"`, out: `"abc"` },
    { inp: "3", out: "3" },
    { inp: "[1,2,3]", out: "{1, 2, 3}" },
    { inp: "true", out: "true" },
    { inp: "false", out: "false" },
    { inp: `{a:3,b:"4"}`, out: `{a = 3, b = "4"}` },
])("Const assignment (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`const myvar = ${inp};`);
    expect(lua).toBe(`local myvar = ${out};`);
});

test.each([
    { inp: `"abc"`, out: `"abc"` },
    { inp: "3", out: "3" },
    { inp: "[1,2,3]", out: "{1, 2, 3}" },
    { inp: "true", out: "true" },
    { inp: "false", out: "false" },
    { inp: `{a:3,b:"4"}`, out: `{a = 3, b = "4"}` },
])("Let assignment (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`let myvar = ${inp};`);
    expect(lua).toBe(`local myvar = ${out};`);
});

test.each([
    { inp: `"abc"`, out: `"abc"` },
    { inp: "3", out: "3" },
    { inp: "[1,2,3]", out: "{1, 2, 3}" },
    { inp: "true", out: "true" },
    { inp: "false", out: "false" },
    { inp: `{a:3,b:"4"}`, out: `{a = 3, b = "4"}` },
])("Var assignment (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`var myvar = ${inp};`);
    expect(lua).toBe(`myvar = ${out};`);
});

test.each(["var myvar;", "let myvar;", "const myvar = null;", "const myvar = undefined;"])(
    "Null assignments (%p)",
    declaration => {
        const result = util.transpileAndExecute(declaration + " return myvar;");
        expect(result).toBe(undefined);
    },
);

test.each([
    { input: ["a", "b"], values: ["e", "f"] },
    { input: ["a", "b"], values: ["e", "f", "g"] },
    { input: ["a", "b", "c"], values: ["e", "f", "g"] },
])("Binding pattern assignment (%p)", ({ input, values }) => {
    const pattern = input.join(",");
    const initializer = values.map(v => `"${v}"`).join(",");

    const tsCode = `const [${pattern}] = [${initializer}]; return [${pattern}].join("-");`;
    const result = util.transpileAndExecute(tsCode);

    expect(result).toBe(values.slice(0, input.length).join("-"));
});

test("Ellipsis binding pattern", () => {
    expect(() => util.transpileString("let [a,b,...c] = [1,2,3];")).toThrowExactError(
        new Error("Ellipsis destruction is not allowed."),
    );
});

test("Tuple Assignment", () => {
    const code = `function abc(): [number, number] { return [1, 2]; };
                  let t: [number, number] = abc();
                  return t[0] + t[1];`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(3);
});

test("TupleReturn assignment", () => {
    const code =
        `/** @tupleReturn */\n` +
        `declare function abc(this: void): number[]\n` +
        `let [a,b] = abc();`;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a, b = abc();");
});

test("TupleReturn Single assignment", () => {
    const code =
        `/** @tupleReturn */\n` +
        `declare function abc(this: void): [number, string];\n` +
        `let a = abc();` +
        `a = abc();`;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a = ({abc()});\na = ({abc()});");
});

test("TupleReturn interface assignment", () => {
    const code =
        `interface def {\n` +
        `/** @tupleReturn */\n` +
        `abc();\n` +
        `} declare const jkl : def;\n` +
        `let [a,b] = jkl.abc();`;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a, b = jkl:abc();");
});

test("TupleReturn namespace assignment", () => {
    const code =
        `declare namespace def {\n` +
        `/** @tupleReturn */\n` +
        `function abc(this: void) {}\n` +
        `}\n` +
        `let [a,b] = def.abc();`;

    const lua = util.transpileString(code);
    expect(lua).toBe("local a, b = def.abc();");
});

test("TupleReturn method assignment", () => {
    const code =
        `declare class def {\n` +
        `/** @tupleReturn */\n` +
        `abc() { return [1,2,3]; }\n` +
        `} const jkl = new def();\n` +
        `let [a,b] = jkl.abc();`;

    const lua = util.transpileString(code);
    expect(lua).toBe("local jkl = def.new();\nlocal a, b = jkl:abc();");
});

test("TupleReturn functional", () => {
    const code = `/** @tupleReturn */
    function abc(): [number, string] { return [3, "a"]; }
    const [a, b] = abc();
    return b + a;`;

    const result = util.transpileAndExecute(code);

    expect(result).toBe("a3");
});

test("TupleReturn single", () => {
    const code = `/** @tupleReturn */
    function abc(): [number, string] { return [3, "a"]; }
    const res = abc();
    return res.length`;

    const result = util.transpileAndExecute(code);

    expect(result).toBe(2);
});

test("TupleReturn in expression", () => {
    const code = `/** @tupleReturn */
    function abc(): [number, string] { return [3, "a"]; }
    return abc()[1] + abc()[0];`;

    const result = util.transpileAndExecute(code);

    expect(result).toBe("a3");
});

test.each(["and", "local", "nil", "not", "or", "repeat", "then", "until"])(
    "Keyword identifier error (%p)",
    identifier => {
        expect(() => util.transpileString(`const ${identifier} = 3;`)).toThrowExactError(
            new TranspileError(`Cannot use Lua keyword ${identifier} as identifier.`),
        );
    },
);

test.each(validTestFunctionAssignments)(
    "Valid function variable declaration (%p)",
    (testFunction, functionType) => {
        const code = `const fn: ${functionType} = ${testFunction.value};
    return fn("foobar");`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(validTestFunctionAssignments)(
    "Valid function assignment (%p)",
    (testFunction, functionType) => {
        const code = `let fn: ${functionType};
    fn = ${testFunction.value};
    return fn("foobar");`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function variable declaration (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    const fn: ${functionType} = ${testFunction.value};`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function assignment (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    let fn: ${functionType};
    fn = ${testFunction.value};`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test.each(validTestFunctionCasts)(
    "Valid function assignment with cast (%p)",
    (testFunction, castedFunction) => {
        const code = `let fn: typeof ${testFunction.value};
    fn = ${castedFunction};
    return fn("foobar");`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(invalidTestFunctionCasts)(
    "Invalid function assignment with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    let fn: typeof ${testFunction.value};
    fn = ${castedFunction};`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test.each(validTestFunctionAssignments)(
    "Valid function argument (%p)",
    (testFunction, functionType) => {
        const code = `function takesFunction(fn: ${functionType}) {
            return fn("foobar");
        }
        return takesFunction(${testFunction.value});`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function argument (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    declare function takesFunction(fn: ${functionType});
    takesFunction(${testFunction.value});`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "fn")
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn");
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test("Valid lua lib function argument", () => {
    const code = `let result = "";
        function foo(this: any, value: string) { result += value; }
        const a = ['foo', 'bar'];
        a.forEach(foo);
        return result;`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Invalid lua lib function argument", () => {
    const code = `declare function foo(this: void, value: string): void;
        declare const a: string[];
        a.forEach(foo);`;
    const err = TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "callbackfn");
    expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
});

test.each(validTestFunctionCasts)(
    "Valid function argument with cast (%p)",
    (testFunction, castedFunction) => {
        const code = `function takesFunction(fn: typeof ${testFunction.value}) {
        return fn("foobar");
    }
    return takesFunction(${castedFunction});`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(invalidTestFunctionCasts)(
    "Invalid function argument with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    declare function takesFunction(fn: typeof ${testFunction.value});
    takesFunction(${castedFunction});`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "fn")
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn");
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

// TODO: Fix function expression inference with generic types. The following should work, but doesn't:
//     function takesFunction<T extends (this: void, s: string) => string>(fn: T) { ... }
//     takesFunction(s => s); // Error: cannot convert method to function
// @TestCases(validTestFunctionAssignments) // Use this instead of other TestCases when fixed
test.each([
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...noSelfTestFunctionExpressions.map(
        (f): TestFunctionAssignment => [f, noSelfTestFunctionType],
    ),
])("Valid function generic argument (%p)", (testFunction, functionType) => {
    const code = `function takesFunction<T extends ${functionType}>(fn: T) {
            return fn("foobar");
        }
        return takesFunction(${testFunction.value});`;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
        "foobar",
    );
});

test.each(invalidTestFunctionAssignments)(
    "Invalid function generic argument (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    declare function takesFunction<T extends ${functionType}>(fn: T);
    takesFunction(${testFunction.value});`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined, "fn")
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn");
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test.each([
    ...anonTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["0", "'foobar'"]]),
    ...selfTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["0", "'foobar'"]]),
    ...noSelfTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["'foobar'"]]),
])("Valid function expression argument with no signature (%p)", (testFunction, args) => {
    const code = `const takesFunction: any = (fn: (this: void, ...args: any[]) => any, ...args: any[]) => {
            return fn(...args);
        }
        return takesFunction(${testFunction.value}, ${args.join(", ")});`;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
        "foobar",
    );
});

test.each(validTestFunctionAssignments)(
    "Valid function return (%p)",
    (testFunction, functionType) => {
        const code = `function returnsFunction(): ${functionType} {
            return ${testFunction.value};
        }
        const fn = returnsFunction();
        return fn("foobar");`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function return (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    function returnsFunction(): ${functionType} {
        return ${testFunction.value};
    }`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test.each(validTestFunctionCasts)(
    "Valid function return with cast (%p)",
    (testFunction, castedFunction) => {
        const code = `function returnsFunction(): typeof ${testFunction.value} {
        return ${castedFunction};
    }
    const fn = returnsFunction();
    return fn("foobar");`;
        expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe(
            "foobar",
        );
    },
);

test.each(invalidTestFunctionCasts)(
    "Invalid function return with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const code = `${testFunction.definition || ""}
    function returnsFunction(): typeof ${testFunction.value} {
        return ${castedFunction};
    }`;
        const err = isSelfConversion
            ? TSTLErrors.UnsupportedSelfFunctionConversion(undefined)
            : TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    },
);

test("Interface method assignment", () => {
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
    expect(result).toBe("foo+method|bar+lambdaProp");
});

test("Valid function tuple assignment", () => {
    const code = `interface Func { (this: void, s: string): string; }
                  function getTuple(): [number, Func] { return [1, s => s]; }
                  let [i, f]: [number, Func] = getTuple();
                  return f("foo");`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

test("Invalid function tuple assignment", () => {
    const code = `interface Func { (this: void, s: string): string; }
                  interface Meth { (this: {}, s: string): string; }
                  declare function getTuple(): [number, Meth];
                  let [i, f]: [number, Func] = getTuple();`;
    expect(() => util.transpileString(code)).toThrowExactError(
        new TranspileError(TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined).message),
    );
});

test("Valid method tuple assignment", () => {
    const code = `interface Foo { method(s: string): string; }
                  interface Meth { (this: Foo, s: string): string; }
                  let meth: Meth = s => s;
                  function getTuple(): [number, Meth] { return [1, meth]; }
                  let [i, f]: [number, Meth] = getTuple();
                  let foo: Foo = {method: f};
                  return foo.method("foo");`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

test("Invalid method tuple assignment", () => {
    const code = `interface Func { (this: void, s: string): string; }
                  interface Meth { (this: {}, s: string): string; }
                  declare function getTuple(): [number, Func];
                  let [i, f]: [number, Meth] = getTuple();`;
    expect(() => util.transpileString(code)).toThrowExactError(
        TSTLErrors.UnsupportedSelfFunctionConversion(undefined),
    );
});

test("Valid interface method assignment", () => {
    const code = `interface A { fn(this: void, s: string): string; }
                  interface B { fn(this: void, s: string): string; }
                  const a: A = { fn(this: void, s) { return s; } };
                  const b: B = a;
                  return b.fn("foo");`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

test("Invalid interface method assignment", () => {
    const code = `interface A { fn(s: string): string; }
                  interface B { fn(this: void, s: string): string; }
                  declare const a: A;
                  const b: B = a;`;
    expect(() => util.transpileString(code)).toThrowExactError(
        TSTLErrors.UnsupportedNoSelfFunctionConversion(undefined, "fn"),
    );
});

test.each([
    { assignType: "(this: any, s: string) => string", args: ["foo"], expectResult: "foobar" },
    { assignType: "{(this: any, s: string): string}", args: ["foo"], expectResult: "foobar" },
    {
        assignType: "(this: any, s1: string, s2: string) => string",
        args: ["foo", "baz"],
        expectResult: "foobaz",
    },
    {
        assignType: "{(this: any, s1: string, s2: string): string}",
        args: ["foo", "baz"],
        expectResult: "foobaz",
    },
])("Valid function overload assignment (%p)", ({ assignType, args, expectResult }) => {
    const code = `interface O {
                      (s1: string, s2: string): string;
                      (s: string): string;
                  }
                  const o: O = (s1: string, s2?: string) => s1 + (s2 || "bar");
                  let f: ${assignType} = o;
                  return f(${args.map(a => '"' + a + '"').join(", ")});`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(expectResult);
});

test.each([
    "(this: void, s: string) => string",
    "(this: void, s1: string, s2: string) => string",
    "{(this: void, s: string): string}",
    "{(this: any, s1: string, s2: string): string}",
])("Invalid function overload assignment (%p)", assignType => {
    const code = `interface O {
                      (this: any, s1: string, s2: string): string;
                      (this: void, s: string): string;
                  }
                  declare const o: O;
                  let f: ${assignType} = o;`;
    expect(() => util.transpileString(code)).toThrowExactError(
        TSTLErrors.UnsupportedOverloadAssignment(undefined),
    );
});

test.each(["noSelf", "noSelfInFile"])("noSelf function method argument (%p)", noSelfTag => {
    const header = `/** @${noSelfTag} */ namespace NS {
            export class C {
                method(fn: (s: string) => string) { return fn("foo"); }
            }
        }
        function foo(this: void, s: string) { return s; }`;
    const code = `const c = new NS.C();
        return c.method(foo);`;
    expect(util.transpileAndExecute(code, undefined, undefined, header, false)).toBe("foo");
});

test.each([
    "(this: void, s: string) => string",
    "(this: any, s: string) => string",
    "(s: string) => string",
])("Function expression type inference in binary operator (%p)", funcType => {
    const header = `declare const undefinedFunc: ${funcType};`;
    const code = `let func: ${funcType} = s => s;
        func = undefinedFunc || (s => s);
        return func("foo");`;
    expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe("foo");
});

test.each(["s => s", "(s => s)", "function(s) { return s; }", "(function(s) { return s; })"])(
    "Function expression type inference in class (%p)",
    funcExp => {
        const code = `class Foo {
        func: (this: void, s: string) => string = ${funcExp};
        method: (s: string) => string = ${funcExp};
        static staticFunc: (this: void, s: string) => string = ${funcExp};
        static staticMethod: (s: string) => string = ${funcExp};
    }
    const foo = new Foo();
    return foo.func("a") + foo.method("b") + Foo.staticFunc("c") + Foo.staticMethod("d");`;
        expect(util.transpileAndExecute(code)).toBe("abcd");
    },
);

test.each([
    { assignTo: "const foo: Foo", funcExp: "s => s" },
    { assignTo: "const foo: Foo", funcExp: "(s => s)" },
    { assignTo: "const foo: Foo", funcExp: "function(s) { return s; }" },
    { assignTo: "const foo: Foo", funcExp: "(function(s) { return s; })" },
    { assignTo: "let foo: Foo; foo", funcExp: "s => s" },
    { assignTo: "let foo: Foo; foo", funcExp: "(s => s)" },
    { assignTo: "let foo: Foo; foo", funcExp: "function(s) { return s; }" },
    { assignTo: "let foo: Foo; foo", funcExp: "(function(s) { return s; })" },
])("Function expression type inference in object literal (%p)", ({ assignTo, funcExp }) => {
    const code = `interface Foo {
            func(this: void, s: string): string;
            method(this: this, s: string): string;
        }
        ${assignTo} = {func: ${funcExp}, method: ${funcExp}};
        return foo.method("foo") + foo.func("bar");`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Function expression type inference in object literal assigned to narrower type", () => {
    const code = `let foo: {} = {bar: s => s};
        return (foo as {bar: (a: any) => any}).bar("foobar");`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test.each([
    { assignTo: "const foo: Foo", funcExp: "s => s" },
    { assignTo: "const foo: Foo", funcExp: "(s => s)" },
    { assignTo: "const foo: Foo", funcExp: "function(s) { return s; }" },
    { assignTo: "const foo: Foo", funcExp: "(function(s) { return s; })" },
    { assignTo: "let foo: Foo; foo", funcExp: "s => s" },
    { assignTo: "let foo: Foo; foo", funcExp: "(s => s)" },
    { assignTo: "let foo: Foo; foo", funcExp: "function(s) { return s; }" },
    { assignTo: "let foo: Foo; foo", funcExp: "(function(s) { return s; })" },
])(
    "Function expression type inference in object literal (generic key) (%p)",
    ({ assignTo, funcExp }) => {
        const code = `interface Foo {
            [f: string]: (this: void, s: string) => string;
        }
        ${assignTo} = {func: ${funcExp}};
        return foo.func("foo");`;
        expect(util.transpileAndExecute(code)).toBe("foo");
    },
);

test.each([
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "s => s",
    },
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(s => s)",
    },
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(function(s) { return s; })",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "s => s",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(s => s)",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(function(s) { return s; })",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "s => s",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "(s => s)",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "(function(s) { return s; })",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "s => s",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "(s => s)",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "(function(s) { return s; })",
    },
])("Function expression type inference in tuple (%p)", ({ assignTo, func, method, funcExp }) => {
    const code = `interface Foo {
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
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test.each([
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "s => s" },
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "(s => s)" },
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "function(s) { return s; }" },
    {
        assignTo: "const meths: Method[]",
        method: "meths[0]",
        funcExp: "(function(s) { return s; })",
    },
    { assignTo: "let meths: Method[]; meths", method: "meths[0]", funcExp: "s => s" },
    { assignTo: "let meths: Method[]; meths", method: "meths[0]", funcExp: "(s => s)" },
    {
        assignTo: "let meths: Method[]; meths",
        method: "meths[0]",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "let meths: Method[]; meths",
        method: "meths[0]",
        funcExp: "(function(s) { return s; })",
    },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "s => s" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "(s => s)" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "function(s) { return s; }" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "(function(s) { return s; })" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "s => s" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "(s => s)" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "function(s) { return s; }" },
    {
        assignTo: "let meth: Method; [meth]",
        method: "meth",
        funcExp: "(function(s) { return s; })",
    },
])("Function expression type inference in array (%p)", ({ assignTo, method, funcExp }) => {
    const code = `interface Foo {
            method(s: string): string;
        }
        interface Method {
            (this: Foo, s: string): string;
        }
        ${assignTo} = [${funcExp}];
        const foo: Foo = {method: ${method}};
        return foo.method("foo");`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in union (%p)", ({ funcType, funcExp }) => {
    const code = `type U = string | number | (${funcType});
        const u: U = ${funcExp};
        return (u as ${funcType})("foo");`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in union tuple (%p)", ({ funcType, funcExp }) => {
    const code = `interface I { callback: ${funcType}; }
        let a: I[] | number = [{ callback: ${funcExp} }];
        return a[0].callback("foo");`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in as cast (%p)", ({ funcType, funcExp }) => {
    const code = `const fn: ${funcType} = (${funcExp}) as (${funcType});
        return fn("foo");`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in type assertion (%p)", ({ funcType, funcExp }) => {
    const code = `const fn: ${funcType} = <${funcType}>(${funcExp});
        return fn("foo");`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in constructor (%p)", ({ funcType, funcExp }) => {
    const code = `class C {
            result: string;
            constructor(fn: (s: string) => string) { this.result = fn("foo"); }
        }
        const c = new C(s => s);
        return c.result;`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test("String table access", () => {
    const code = `const dict : {[key:string]:any} = {};
                  dict["a b"] = 3;
                  return dict["a b"];`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(3);
});
