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
} from "./functionPermutations";

test.each(validTestFunctionAssignments)("Valid function variable declaration (%p)", (testFunction, functionType) => {
    const code = `const fn: ${functionType} = ${testFunction.value};
    return fn("foobar");`;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test.each(validTestFunctionAssignments)("Valid function assignment (%p)", (testFunction, functionType) => {
    const code = `let fn: ${functionType};
    fn = ${testFunction.value};
    return fn("foobar");`;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test.each(validTestFunctionCasts)("Valid function assignment with cast (%p)", (testFunction, castedFunction) => {
    const code = `
            let fn: typeof ${testFunction.value};
            fn = ${castedFunction};
            return fn("foobar");
        `;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test.each(validTestFunctionAssignments)("Valid function argument (%p)", (testFunction, functionType) => {
    const code = `
            function takesFunction(fn: ${functionType}) {
                return fn("foobar");
            }
            return takesFunction(${testFunction.value});
        `;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test("Valid lua lib function argument", () => {
    const code = `let result = "";
        function foo(this: any, value: string) { result += value; }
        const a = ['foo', 'bar'];
        a.forEach(foo);
        return result;`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test.each(validTestFunctionCasts)("Valid function argument with cast (%p)", (testFunction, castedFunction) => {
    const code = `
            function takesFunction(fn: typeof ${testFunction.value}) {
                return fn("foobar");
            }
            return takesFunction(${castedFunction});
        `;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
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
    const code = `
        function takesFunction<T extends ${functionType}>(fn: T) {
            return fn("foobar");
        }
        return takesFunction(${testFunction.value});
    `;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test.each([
    ...anonTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["0", "'foobar'"]]),
    ...selfTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["0", "'foobar'"]]),
    ...noSelfTestFunctionExpressions.map((f): [TestFunction, string[]] => [f, ["'foobar'"]]),
])("Valid function expression argument with no signature (%p)", (testFunction, args) => {
    const code = `
        const takesFunction: any = (fn: (this: void, ...args: any[]) => any, ...args: any[]) => {
            return fn(...args);
        }
        return takesFunction(${testFunction.value}, ${args.join(", ")});
    `;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test.each(validTestFunctionAssignments)("Valid function return (%p)", (testFunction, functionType) => {
    const code = `
            function returnsFunction(): ${functionType} {
                return ${testFunction.value};
            }
            const fn = returnsFunction();
            return fn("foobar");
        `;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test.each(validTestFunctionCasts)("Valid function return with cast (%p)", (testFunction, castedFunction) => {
    const code = `function returnsFunction(): typeof ${testFunction.value} {
                          return ${castedFunction};
                      }
                      const fn = returnsFunction();
                      return fn("foobar");`;
    expect(util.transpileAndExecute(code, undefined, undefined, testFunction.definition)).toBe("foobar");
});

test("Valid function tuple assignment", () => {
    const code = `interface Func { (this: void, s: string): string; }
                  function getTuple(): [number, Func] { return [1, s => s]; }
                  let [i, f]: [number, Func] = getTuple();
                  return f("foo");`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

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

test("Valid interface method assignment", () => {
    const code = `interface A { fn(this: void, s: string): string; }
                  interface B { fn(this: void, s: string): string; }
                  const a: A = { fn(this: void, s) { return s; } };
                  const b: B = a;
                  return b.fn("foo");`;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
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

test.each([
    { assignType: "(this: any, s: string) => string", args: ["foo"], expectResult: "foobar" },
    { assignType: "{(this: any, s: string): string}", args: ["foo"], expectResult: "foobar" },
    { assignType: "(this: any, s1: string, s2: string) => string", args: ["foo", "baz"], expectResult: "foobaz" },
    { assignType: "{(this: any, s1: string, s2: string): string}", args: ["foo", "baz"], expectResult: "foobaz" },
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
