import * as util from "../../../util";
import { invalidTestFunctionAssignments, invalidTestFunctionCasts } from "./functionPermutations";

test.each(invalidTestFunctionAssignments)(
    "Invalid function variable declaration (%p)",
    (testFunction, functionType) => {
        util.testModule`
            ${testFunction.definition || ""}
            const fn: ${functionType} = ${testFunction.value};
        `.expectDiagnosticsToMatchSnapshot(undefined, true);
    }
);

test.each(invalidTestFunctionAssignments)("Invalid function assignment (%p)", (testFunction, functionType) => {
    util.testModule`
        ${testFunction.definition || ""}
        let fn: ${functionType};
        fn = ${testFunction.value};
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each(invalidTestFunctionCasts)("Invalid function assignment with cast (%p)", (testFunction, castedFunction) => {
    util.testModule`
        ${testFunction.definition || ""}
        let fn: typeof ${testFunction.value};
        fn = ${castedFunction};
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each(invalidTestFunctionAssignments)("Invalid function argument (%p)", (testFunction, functionType) => {
    util.testModule`
        ${testFunction.definition || ""}
        declare function takesFunction(fn: ${functionType});
        takesFunction(${testFunction.value});
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test("Invalid lua lib function argument", () => {
    util.testModule`
        declare function foo(this: void, value: string): void;
        declare const a: string[];
        a.forEach(foo);
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each(invalidTestFunctionCasts)("Invalid function argument with cast (%p)", (testFunction, castedFunction) => {
    util.testModule`
        ${testFunction.definition || ""}
        declare function takesFunction(fn: typeof ${testFunction.value});
        takesFunction(${castedFunction});
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each(invalidTestFunctionAssignments)("Invalid function generic argument (%p)", (testFunction, functionType) => {
    util.testModule`
        ${testFunction.definition || ""}
        declare function takesFunction<T extends ${functionType}>(fn: T);
        takesFunction(${testFunction.value});
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each(invalidTestFunctionAssignments)("Invalid function return (%p)", (testFunction, functionType) => {
    util.testModule`
        ${testFunction.definition || ""}
        function returnsFunction(): ${functionType} {
            return ${testFunction.value};
        }
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each(invalidTestFunctionCasts)("Invalid function return with cast (%p)", (testFunction, castedFunction) => {
    util.testModule`
        ${testFunction.definition || ""}
        function returnsFunction(): typeof ${testFunction.value} {
            return ${castedFunction};
        }
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test("Invalid function tuple assignment", () => {
    util.testModule`
        interface Func { (this: void, s: string): string; }
        interface Meth { (this: {}, s: string): string; }
        declare function getTuple(): [number, Meth];
        let [i, f]: [number, Func] = getTuple();
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test("Invalid method tuple assignment", () => {
    util.testModule`
        interface Func { (this: void, s: string): string; }
        interface Meth { (this: {}, s: string): string; }
        declare function getTuple(): [number, Func];
        let [i, f]: [number, Meth] = getTuple();
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test("Invalid interface method assignment", () => {
    util.testModule`
        interface A { fn(s: string): string; }
        interface B { fn(this: void, s: string): string; }
        declare const a: A;
        const b: B = a;
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});

test.each([
    "(this: void, s: string) => string",
    "(this: void, s1: string, s2: string) => string",
    "{(this: void, s: string): string}",
    "{(this: any, s1: string, s2: string): string}",
])("Invalid function overload assignment (%p)", assignType => {
    util.testModule`
        interface O {
            (this: any, s1: string, s2: string): string;
            (this: void, s: string): string;
        }
        declare const o: O;
        let f: ${assignType} = o;
    `.expectDiagnosticsToMatchSnapshot(undefined, true);
});
