export interface TestFunction {
    value: string;
    definition?: string;
}

export const selfTestFunctions: TestFunction[] = [
    {
        value: "selfFunc",
        definition: "let selfFunc: {(this: any, s: string): string} = function(s) { return s; };",
    },
    {
        value: "selfLambda",
        definition: "let selfLambda: (this: any, s: string) => string = s => s;",
    },
    {
        value: "anonFunc",
        definition: "let anonFunc: {(s: string): string} = function(s) { return s; };",
    },
    {
        value: "anonLambda",
        definition: "let anonLambda: (s: string) => string = s => s;",
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
        definition: "class AnonStaticMethodClass { static anonStaticMethod(s: string): string { return s; } }",
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
        definition: "namespace FuncNs { export function nsFunc(s: string) { return s; } }",
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
    {
        value: "anonMethodClassMergedNoSelfNS.method",
        definition: `class AnonMethodClassMergedNoSelfNS { method(s: string): string { return s; } }
            /** @noSelf */ namespace AnonMethodClassMergedNoSelfNS { export function nsFunc(s: string) { return s; } }
            const anonMethodClassMergedNoSelfNS = new AnonMethodClassMergedNoSelfNS();`,
    },
    {
        value: "AnonFuncNSMergedNoSelfClass.nsFunc",
        definition: `/** @noSelf */ class AnonFuncNSMergedNoSelfClass { method(s: string): string { return s; } }
            namespace AnonFuncNSMergedNoSelfClass { export function nsFunc(s: string) { return s; } }`,
    },
    {
        value: "SelfAnonFuncNSMergedNoSelfNS.nsFuncSelf",
        definition: `namespace SelfAnonFuncNSMergedNoSelfNS { export function nsFuncSelf(s: string): string { return s; } }
        /** @noSelf */ namespace SelfAnonFuncNSMergedNoSelfNS { export function nsFuncNoSelf(s: string) { return s; } }`,
    },
];

export const noSelfTestFunctions: TestFunction[] = [
    {
        value: "voidFunc",
        definition: "let voidFunc: {(this: void, s: string): string} = function(s) { return s; };",
    },
    {
        value: "voidLambda",
        definition: "let voidLambda: (this: void, s: string) => string = s => s;",
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
        definition: "/** @noSelf */ namespace NoSelfFuncNs { export function noSelfNsFunc(s: string) { return s; } }",
    },
    {
        value: "NoSelfFuncNs.noSelfNsFunc",
        definition: `namespace NoSelfFuncNs {
            /** @noSelf */
            export function noSelfNsFunc(s: string) { return s; } }`,
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
        value: "noSelfMethodClass.noSelfMethod",
        definition: `class NoSelfMethodClass { 
                /** @noSelf */
                noSelfMethod(s: string): string { return s; } 
            }
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
        value: "noSelfMethodInterface.noSelfMethod",
        definition: `interface NoSelfMethodInterface { 
                /** @noSelf */ 
                noSelfMethod(s: string): string;
            }
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
    {
        value: "noSelfAnonMethodClassMergedNS.method",
        definition: `/** @noSelf */ class NoSelfAnonMethodClassMergedNS { method(s: string): string { return s; } }
            namespace NoSelfAnonMethodClassMergedNS { export function nsFunc(s: string) { return s; } }
            const noSelfAnonMethodClassMergedNS = new NoSelfAnonMethodClassMergedNS();`,
    },
    {
        value: "NoSelfAnonFuncNSMergedClass.nsFunc",
        definition: `class NoSelfAnonFuncNSMergedClass { method(s: string): string { return s; } }
        /** @noSelf */ namespace NoSelfAnonFuncNSMergedClass { export function nsFunc(s: string) { return s; } }`,
    },
    {
        value: "NoSelfAnonFuncNSMergedSelfNS.nsFuncNoSelf",
        definition: `namespace NoSelfAnonFuncNSMergedSelfNS { export function nsFuncSelf(s: string): string { return s; } }
        /** @noSelf */ namespace NoSelfAnonFuncNSMergedSelfNS { export function nsFuncNoSelf(s: string) { return s; } }`,
    },
];

const noSelfInFileTestFunctions: TestFunction[] = [
    {
        value: "noSelfInFileFunc",
        definition: "/** @noSelfInFile */ let noSelfInFileFunc: {(s: string): string} = function(s) { return s; };",
    },
    {
        value: "noSelfInFileLambda",
        definition: "/** @noSelfInFile */ let noSelfInFileLambda: (s: string) => string = s => s;",
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

export const anonTestFunctionExpressions: TestFunction[] = [
    { value: "s => s" },
    { value: "(s => s)" },
    { value: "function(s) { return s; }" },
    { value: "(function(s) { return s; })" },
];

export const selfTestFunctionExpressions: TestFunction[] = [
    { value: "function(this: any, s) { return s; }" },
    { value: "(function(this: any, s) { return s; })" },
];

export const noSelfTestFunctionExpressions: TestFunction[] = [
    { value: "function(this: void, s) { return s; }" },
    { value: "(function(this: void, s) { return s; })" },
];

export const anonTestFunctionType = "(s: string) => string";
export const selfTestFunctionType = "(this: any, s: string) => string";
export const noSelfTestFunctionType = "(this: void, s: string) => string";

type TestFunctionCast = [
    /* testFunction: */ TestFunction,
    /* castedFunction: */ string,
    /* isSelfConversion?: */ boolean?
];
export const validTestFunctionCasts: TestFunctionCast[] = [
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
export const invalidTestFunctionCasts: TestFunctionCast[] = [
    [noSelfTestFunctions[0], `<${anonTestFunctionType}>(${noSelfTestFunctions[0].value})`, false],
    [noSelfTestFunctions[0], `(${noSelfTestFunctions[0].value}) as (${anonTestFunctionType})`, false],
    [noSelfTestFunctions[0], `<${selfTestFunctionType}>(${noSelfTestFunctions[0].value})`, false],
    [noSelfTestFunctions[0], `(${noSelfTestFunctions[0].value}) as (${selfTestFunctionType})`, false],
    [noSelfInFileTestFunctions[0], `<${selfTestFunctionType}>(${noSelfInFileTestFunctions[0].value})`, false],
    [noSelfInFileTestFunctions[0], `(${noSelfInFileTestFunctions[0].value}) as (${selfTestFunctionType})`, false],
    [selfTestFunctions[0], `<${noSelfTestFunctionType}>(${selfTestFunctions[0].value})`, true],
    [selfTestFunctions[0], `(${selfTestFunctions[0].value}) as (${noSelfTestFunctionType})`, true],
];

export type TestFunctionAssignment = [
    /* testFunction: */ TestFunction,
    /* functionType: */ string,
    /* isSelfConversion?: */ boolean?
];
export const validTestFunctionAssignments: TestFunctionAssignment[] = [
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
export const invalidTestFunctionAssignments: TestFunctionAssignment[] = [
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType, false]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType, true]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
    ...noSelfInFileTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType, false]),
    ...noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType, true]),
    ...noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType, true]),
];
