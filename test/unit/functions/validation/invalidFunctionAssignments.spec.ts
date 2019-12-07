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
        const code = `
            ${testFunction.definition || ""}
            const fn: ${functionType} = ${testFunction.value};
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function assignment (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            let fn: ${functionType};
            fn = ${testFunction.value};
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test.each(invalidTestFunctionCasts)(
    "Invalid function assignment with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            let fn: typeof ${testFunction.value};
            fn = ${castedFunction};
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function argument (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            declare function takesFunction(fn: ${functionType});
            takesFunction(${testFunction.value});
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub, "fn")
            : UnsupportedNoSelfFunctionConversion(util.nodeStub, "fn");
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test("Invalid lua lib function argument", () => {
    const code = `
        declare function foo(this: void, value: string): void;
        declare const a: string[];
        a.forEach(foo);
    `;
    const err = UnsupportedSelfFunctionConversion(util.nodeStub, "callbackfn");
    expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
});

test.each(invalidTestFunctionCasts)(
    "Invalid function argument with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            declare function takesFunction(fn: typeof ${testFunction.value});
            takesFunction(${castedFunction});
        `;
        // TODO: Changed in #705 because of order change in `transformArguments`.
        // After #412 both errors should be reported.
        const err = isSelfConversion
            ? UnsupportedNoSelfFunctionConversion(util.nodeStub)
            : UnsupportedSelfFunctionConversion(util.nodeStub);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function generic argument (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            declare function takesFunction<T extends ${functionType}>(fn: T);
            takesFunction(${testFunction.value});
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub, "fn")
            : UnsupportedNoSelfFunctionConversion(util.nodeStub, "fn");
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test.each(invalidTestFunctionAssignments)(
    "Invalid function return (%p)",
    (testFunction, functionType, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            function returnsFunction(): ${functionType} {
                return ${testFunction.value};
            }
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test.each(invalidTestFunctionCasts)(
    "Invalid function return with cast (%p)",
    (testFunction, castedFunction, isSelfConversion) => {
        const code = `
            ${testFunction.definition || ""}
            function returnsFunction(): typeof ${testFunction.value} {
                return ${castedFunction};
            }
        `;
        const err = isSelfConversion
            ? UnsupportedSelfFunctionConversion(util.nodeStub)
            : UnsupportedNoSelfFunctionConversion(util.nodeStub);
        expect(() => util.transpileString(code, undefined, false)).toThrowExactError(err);
    }
);

test("Interface method assignment", () => {
    const code = `
        class Foo {
            method(s: string): string { return s + "+method"; }
            lambdaProp: (s: string) => string = s => s + "+lambdaProp";
        }
        interface IFoo {
            method: (s: string) => string;
            lambdaProp(s: string): string;
        }
        const foo: IFoo = new Foo();
        return foo.method("foo") + "|" + foo.lambdaProp("bar");
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo+method|bar+lambdaProp");
});

test("Invalid function tuple assignment", () => {
    const code = `
        interface Func { (this: void, s: string): string; }
        interface Meth { (this: {}, s: string): string; }
        declare function getTuple(): [number, Meth];
        let [i, f]: [number, Func] = getTuple();
    `;
    expect(() => util.transpileString(code)).toThrowExactError(UnsupportedNoSelfFunctionConversion(util.nodeStub));
});

test("Invalid method tuple assignment", () => {
    const code = `
        interface Func { (this: void, s: string): string; }
        interface Meth { (this: {}, s: string): string; }
        declare function getTuple(): [number, Func];
        let [i, f]: [number, Meth] = getTuple();
    `;
    expect(() => util.transpileString(code)).toThrowExactError(UnsupportedSelfFunctionConversion(util.nodeStub));
});

test("Invalid interface method assignment", () => {
    const code = `
        interface A { fn(s: string): string; }
        interface B { fn(this: void, s: string): string; }
        declare const a: A;
        const b: B = a;
    `;
    expect(() => util.transpileString(code)).toThrowExactError(
        UnsupportedNoSelfFunctionConversion(util.nodeStub, "fn")
    );
});

test.each([
    "(this: void, s: string) => string",
    "(this: void, s1: string, s2: string) => string",
    "{(this: void, s: string): string}",
    "{(this: any, s1: string, s2: string): string}",
])("Invalid function overload assignment (%p)", assignType => {
    const code = `
        interface O {
            (this: any, s1: string, s2: string): string;
            (this: void, s: string): string;
        }
        declare const o: O;
        let f: ${assignType} = o;
    `;
    expect(() => util.transpileString(code)).toThrowExactError(UnsupportedOverloadAssignment(util.nodeStub));
});
