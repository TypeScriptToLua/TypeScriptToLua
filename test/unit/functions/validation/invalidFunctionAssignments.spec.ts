import {
    UnsupportedNoSelfFunctionConversion,
    UnsupportedOverloadAssignment,
    UnsupportedSelfFunctionConversion,
} from "../../../../src/transformation/utils/errors";
import * as util from "../../../util";
import { invalidTestFunctionAssignments, invalidTestFunctionCasts } from "./functionPermutations";

test.each(invalidTestFunctionAssignments)(
    "Invalid function variable declaration (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);

        util.testModule`
            ${testFunction.definition || ""}
            const fn: ${functionType} = ${testFunction.value};
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function assignment (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);

        util.testModule`
            ${testFunction.definition || ""}
            let fn: ${functionType};
            fn = ${testFunction.value};
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test.each(invalidTestFunctionCasts)(
    "Invalid function assignment with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);

        util.testModule`
            ${testFunction.definition || ""}
            let fn: typeof ${testFunction.value};
            fn = ${castedFunction};
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function argument (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub, "fn")
            : UnsupportedNoSelfFunctionConversion(util.nodeStub, "fn");

        util.testModule`
            ${testFunction.definition || ""}
            declare function takesFunction(fn: ${functionType});
            takesFunction(${testFunction.value});
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test("Invalid lua lib function argument", () => {
    util.testModule`
        declare function foo(this: void, value: string): void;
        declare const a: string[];
        a.forEach(foo);
    `.expectToHaveDiagnosticOfError(UnsupportedSelfFunctionConversion(util.nodeStub, "callbackfn"));
});

test.each(invalidTestFunctionCasts)(
    "Invalid function argument with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedNoSelfFunctionConversion(util.nodeStub)
            : UnsupportedSelfFunctionConversion(util.nodeStub);

        // TODO: Changed in #705 because of order change in `transformArguments`.
        // After #412 both errors should be reported.
        util.testModule`
            ${testFunction.definition || ""}
            declare function takesFunction(fn: typeof ${testFunction.value});
            takesFunction(${castedFunction});
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function generic argument (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub, "fn")
            : UnsupportedNoSelfFunctionConversion(util.nodeStub, "fn");

        util.testModule`
            ${testFunction.definition || ""}
            declare function takesFunction<T extends ${functionType}>(fn: T);
            takesFunction(${testFunction.value});
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function return (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);

        util.testModule`
            ${testFunction.definition || ""}
            function returnsFunction(): ${functionType} {
                return ${testFunction.value};
            }
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test.each(invalidTestFunctionCasts)(
    "Invalid function return with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const expectedError = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);

        util.testModule`
            ${testFunction.definition || ""}
            function returnsFunction(): typeof ${testFunction.value} {
                return ${castedFunction};
            }
        `.expectToHaveDiagnosticOfError(expectedError);
    }
);

test("Interface method assignment", () => {
    util.testFunction`
        class Foo {
            method(s: string): string { return s + "+method"; }
            lambdaProp: (s: string) => string = s => s + "+lambdaProp";
        }
        const foo: IFoo = new Foo();
        return foo.method("foo") + "|" + foo.lambdaProp("bar");
    `
        .setTsHeader(
            `
        interface IFoo {
            method: (s: string) => string;
            lambdaProp(s: string): string;
        }
    `
        )
        .expectToMatchJsResult();
});

test("Invalid function tuple assignment", () => {
    util.testModule`
        interface Func { (this: void, s: string): string; }
        interface Meth { (this: {}, s: string): string; }
        declare function getTuple(): [number, Meth];
        let [i, f]: [number, Func] = getTuple();
    `
        .disableSemanticCheck()
        .expectToHaveDiagnosticOfError(UnsupportedNoSelfFunctionConversion(util.nodeStub));
});

test("Invalid method tuple assignment", () => {
    util.testModule`
        interface Func { (this: void, s: string): string; }
        interface Meth { (this: {}, s: string): string; }
        declare function getTuple(): [number, Func];
        let [i, f]: [number, Meth] = getTuple();
    `.expectToHaveDiagnosticOfError(UnsupportedSelfFunctionConversion(util.nodeStub));
});

test("Invalid interface method assignment", () => {
    util.testModule`
        interface A { fn(s: string): string; }
        interface B { fn(this: void, s: string): string; }
        declare const a: A;
        const b: B = a;
    `.expectToHaveDiagnosticOfError(UnsupportedNoSelfFunctionConversion(util.nodeStub, "fn"));
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
    `.expectToHaveDiagnosticOfError(UnsupportedOverloadAssignment(util.nodeStub));
});
