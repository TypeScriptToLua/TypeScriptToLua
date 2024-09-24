import * as util from "../../../util";
import {
    anonTestFunctionExpressions,
    anonTestFunctionType,
    noSelfTestFunctionExpressions,
    noSelfTestFunctions,
    noSelfTestFunctionType,
    selfTestFunctionExpressions,
    selfTestFunctions,
    selfTestFunctionType,
    TestFunction,
    TestFunctionAssignment,
    validTestFunctionAssignments,
    validTestFunctionCasts,
    validTestMethodAssignments,
    validTestMethodCasts,
} from "./functionPermutations";

test.each(validTestFunctionAssignments)("Valid function variable declaration (%p)", (testFunction, functionType) => {
    util.testFunction`
        const fn: ${functionType} = ${testFunction.value};
        return fn("foobar");
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each(validTestMethodAssignments)("Valid object wit method declaration (%p, %p)", (testFunction, functionType) => {
    util.testFunction`
        const obj: { fn: ${functionType} } = {fn: ${testFunction.value}};
        return obj.fn("foobar");
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each(validTestFunctionAssignments)("Valid function assignment (%p)", (testFunction, functionType) => {
    util.testFunction`
        let fn: ${functionType};
        fn = ${testFunction.value};
        return fn("foobar");
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each(validTestFunctionCasts)("Valid function assignment with cast (%p)", (testFunction, castedFunction) => {
    util.testFunction`
        let fn: typeof ${testFunction.value};
        fn = ${castedFunction};
        return fn("foobar");
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each(validTestMethodCasts)(
    "Valid object with method assignment with cast (%p, %p)",
    (testFunction, castedFunction) => {
        util.testFunction`
            let obj: { fn: typeof ${testFunction.value} };
            obj = {fn: ${castedFunction}};
            return obj.fn("foobar");
        `
            .setTsHeader(testFunction.definition ?? "")
            .expectToMatchJsResult();
    }
);

test.each(validTestFunctionAssignments)("Valid function argument (%p)", (testFunction, functionType) => {
    util.testFunction`
        function takesFunction(fn: ${functionType}) {
            return fn("foobar");
        }
        return takesFunction(${testFunction.value});
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each(validTestMethodAssignments)("Valid object with method argument (%p, %p)", (testFunction, functionType) => {
    util.testFunction`
        function takesObjectWithMethod(obj: { fn: ${functionType} }) {
            return obj.fn("foobar");
        }
        return takesObjectWithMethod({fn: ${testFunction.value}});
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test("Valid lua lib function argument", () => {
    util.testFunction`
        let result = "";
        function foo(this: any, value: string) { result += value; }
        const a = ['foo', 'bar'];
        a.forEach(foo);
        return result;
    `.expectToMatchJsResult();
});

test.each(validTestFunctionCasts)("Valid function argument with cast (%p)", (testFunction, castedFunction) => {
    util.testFunction`
        function takesFunction(fn: typeof ${testFunction.value}) {
            return fn("foobar");
        }
        return takesFunction(${castedFunction});
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each([
    // TODO: Fix function expression inference with generic types. The following should work, but doesn't:
    //     function takesFunction<T extends (this: void, s: string) => string>(fn: T) { ... }
    //     takesFunction(s => s); // Error: cannot convert method to function
    // ...validTestFunctionAssignments - Use this instead of other cases when fixed
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...selfTestFunctions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...noSelfTestFunctions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, anonTestFunctionType]),
    ...selfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, selfTestFunctionType]),
    ...noSelfTestFunctionExpressions.map((f): TestFunctionAssignment => [f, noSelfTestFunctionType]),
])("Valid function generic argument (%p)", (testFunction, functionType) => {
    util.testFunction`
        function takesFunction<T extends ${functionType}>(fn: T) {
            return fn("foobar");
        }
        return takesFunction(${testFunction.value});
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each([
    ...anonTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["0", "'foobar'"]]),
    ...selfTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["0", "'foobar'"]]),
    ...noSelfTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["'foobar'"]]),
])("Valid function expression argument with no signature (%p, %p)", (testFunction, args) => {
    util.testFunction`
        const takesFunction: any = (fn: (this: void, ...args: any[]) => any, ...args: any[]) => {
            return fn(...args);
        }
        return takesFunction(${testFunction.value}, ${args.join(", ")});
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToEqual("foobar");
});

test.each(validTestFunctionAssignments)("Valid function return (%p)", (testFunction, functionType) => {
    util.testFunction`
        function returnsFunction(): ${functionType} {
            return ${testFunction.value};
        }
        const fn = returnsFunction();
        return fn("foobar");
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test.each(validTestFunctionCasts)("Valid function return with cast (%p)", (testFunction, castedFunction) => {
    util.testFunction`
        function returnsFunction(): typeof ${testFunction.value} {
            return ${castedFunction};
        }
        const fn = returnsFunction();
        return fn("foobar");
    `
        .setTsHeader(testFunction.definition ?? "")
        .expectToMatchJsResult();
});

test("Valid function tuple assignment", () => {
    util.testFunction`
        interface Func { (this: void, s: string): string; }
        function getTuple(): [number, Func] { return [1, s => s]; }
        let [i, f]: [number, Func] = getTuple();
        return f("foo");
    `.expectToMatchJsResult();
});

test("Interface method assignment", () => {
    util.testFunction`
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
    `.expectToMatchJsResult();
});

test("Valid interface method assignment", () => {
    util.testFunction`
        interface A { fn(this: void, s: string): string; }
        interface B { fn(this: void, s: string): string; }
        const a: A = { fn(this: void, s) { return s; } };
        const b: B = a;
        return b.fn("foo");
    `.expectToMatchJsResult();
});

test("Valid method tuple assignment", () => {
    util.testFunction`
        interface Foo { method(s: string): string; }
        interface Meth { (this: Foo, s: string): string; }
        let meth: Meth = s => s;
        function getTuple(): [number, Meth] { return [1, meth]; }
        let [i, f]: [number, Meth] = getTuple();
        let foo: Foo = {method: f};
        return foo.method("foo");
    `.expectToMatchJsResult();
});

test.each([
    { assignType: "(this: any, s: string) => string", args: ["foo"] },
    { assignType: "{(this: any, s: string): string}", args: ["foo"] },
    { assignType: "(this: any, s1: string, s2: string) => string", args: ["foo", "baz"] },
    { assignType: "{(this: any, s1: string, s2: string): string}", args: ["foo", "baz"] },
])("Valid function overload assignment (%p)", ({ assignType, args }) => {
    util.testFunction`
        interface O {
            (s1: string, s2: string): string;
            (s: string): string;
        }
        const o: O = (s1: string, s2?: string) => s1 + (s2 || "bar");
        let f: ${assignType} = o;
        return f(${args.map(a => '"' + a + '"').join(", ")});
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/896
test("Does not fail on union type signatures (#896)", () => {
    util.testExpression`foo<'a'>(() => {});`
        .setTsHeader(
            `
        declare interface Events {
            a(): void;
            [key: string]: Function;
        }      
        declare function foo<T extends 'a' | 'b'>(callback: Events[T]): void;
    `
        )
        .expectToHaveNoDiagnostics();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1568
test("No false positives when using generic functions (#1568)", () => {
    util.testModule`
        /** @noSelf */
        declare namespace Test {
            export function testCallback<T extends (...args: any[]) => void>(
                callback: T,
            ): void;
        }

        Test.testCallback(() => {});

        const f = () => {};
        Test.testCallback(f);
    `.expectToHaveNoDiagnostics();
});
