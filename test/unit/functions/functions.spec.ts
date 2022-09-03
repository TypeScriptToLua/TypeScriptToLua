import * as ts from "typescript";
import * as tstl from "../../../src";
import * as util from "../../util";
import { unsupportedForTarget } from "../../../src/transformation/utils/diagnostics";

test("Arrow Function Expression", () => {
    util.testFunction`
        const add = (a, b) => a + b;
        return add(1, 2);
    `.expectToMatchJsResult();
});

test("Returning arrow function from arrow function", () => {
    util.testFunction`
        const add = (x: number) => (y: number) => x + y;
        return add(1)(2);
    `.expectToMatchJsResult();
});

test.each(["i++", "i--", "++i", "--i"])("Arrow function unary expression (%p)", lambda => {
    util.testFunction`
        let i = 10;
        [1,2,3,4,5].forEach(() => ${lambda});
        return i;
    `.expectToMatchJsResult();
});

test.each(["b => a = b", "b => a += b", "b => a -= b", "b => a *= b", "b => a /= b", "b => a **= b", "b => a %= b"])(
    "Arrow function assignment (%p)",
    lambda => {
        util.testFunction`
            let a = 10;
            let lambda = ${lambda};
            lambda(5);
            return a;
        `.expectToMatchJsResult();
    }
);

test.each([{ args: [] }, { args: [1] }, { args: [1, 2] }])("Arrow default values (%p)", ({ args }) => {
    util.testFunction`
        const add = (a = 3, b = 4) => a + b;
        return add(${util.formatCode(...args)});
    `.expectToMatchJsResult();
});

test("Function Expression", () => {
    util.testFunction`
        let add = function(a, b) {return a+b};
        return add(1,2);
    `.expectToMatchJsResult();
});

test("Function definition scope", () => {
    util.testFunction`
        function abc() { function xyz() { return 5; } }
        function def() { function xyz() { return 3; } abc(); return xyz(); }
        return def();
    `.expectToMatchJsResult();
});

test("Function default parameter", () => {
    util.testFunction`
        function abc(defaultParam: string = "abc") { return defaultParam; }
        return abc() + abc("def");
    `.expectToMatchJsResult();
});

test.each([{ inp: [] }, { inp: [5] }, { inp: [1, 2] }])("Function Default Values (%p)", ({ inp }) => {
    const callArgs = inp.join(",");

    util.testFunction(
        `let add = function(a: number = 3, b: number = 4) { return a+b; };
        return add(${callArgs});`
    ).expectToMatchJsResult();
});

test("Function default array binding parameter", () => {
    util.testFunction`
        function foo([bar]: [string] = ["foobar"]) {
            return bar;
        }
        return foo();
    `.expectToMatchJsResult();
});

test("Function default object binding parameter", () => {
    util.testFunction`
        function foo({ bar }: { bar: string } = { bar: "foobar" }) {
            return bar;
        }
        return foo();
    `.expectToMatchJsResult();
});

test("Function default binding parameter maintains order", () => {
    util.testFunction`
        const resultsA = [{x: "foo"}, {x: "baz"}];
        const resultsB = ["blah", "bar"];
        let i = 0;
        function a() { return resultsA[i++]; }
        function b() { return resultsB[i++]; }
        function foo({ x }: { x: string } = a(), y = b()) {
            return x + y;
        }
        return foo();
    `.expectToMatchJsResult();
});

test("Class method call", () => {
    util.testFunction`
        class TestClass {
            public classMethod(): number { return 4; }
        }

        const classInstance = new TestClass();
        return classInstance.classMethod();
    `.expectToMatchJsResult();
});

test("Class dot method call void", () => {
    util.testFunction`
        class TestClass {
            public dotMethod: () => number = () => 4;
        }

        const classInstance = new TestClass();
        return classInstance.dotMethod();
    `.expectToMatchJsResult();
});

test("Class dot method call with parameter", () => {
    util.testFunction`
        class TestClass {
            public dotMethod: (x: number) => number = x => 3 * x;
        }

        const classInstance = new TestClass();
        return classInstance.dotMethod(4);
    `.expectToMatchJsResult();
});

test("Class static dot method", () => {
    util.testFunction`
        class TestClass {
            public static dotMethod: () => number = () => 4;
        }

        return TestClass.dotMethod();
    `.expectToMatchJsResult();
});

test("Class static dot method with parameter", () => {
    util.testFunction`
        class TestClass {
            public static dotMethod: (x: number) => number = x => 3 * x;
        }

        return TestClass.dotMethod(4);
    `.expectToMatchJsResult();
});

const functionTypeDeclarations = [
    ["arrow", ": (...args: any) => any"],
    ["call signature", ": { (...args: any): any; }"],
    ["generic", ": Function"],
    ["inferred", ""],
];

test.each(functionTypeDeclarations)("Function bind (%s)", (_, type) => {
    util.testFunction`
        const abc${type} = function (this: { a: number }, a: string, b: string) { return this.a + a + b; }
        return abc.bind({ a: 4 }, "b")("c");
    `.expectToMatchJsResult();
});

test.each(functionTypeDeclarations)("Function apply (%s)", (_, type) => {
    util.testFunction`
        const abc${type} = function (this: { a: number }, a: string) { return this.a + a; }
        return abc.apply({ a: 4 }, ["b"]);
    `.expectToMatchJsResult();
});

// Fix #1226: https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1226
test.each(functionTypeDeclarations)("function apply without arguments should not lead to exception (%s)", (_, type) => {
    util.testFunction`
        const f${type} = function (this: number) { return this + 3; }
        return f.apply(4);
    `.expectToMatchJsResult();
});

// Issue #1218: https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1218
test.each(["() => 4", "undefined"])("prototype call on nullable function (%p)", value => {
    util.testFunction`
        function call(f?: () => number) {
            return f?.apply(3);
        }
        return call(${value});
    `
        .setOptions({ strictNullChecks: true })
        .expectToMatchJsResult();
});

test.each(functionTypeDeclarations)("Function call (%s)", (_, type) => {
    util.testFunction`
        const abc${type} = function (this: { a: number }, a: string) { return this.a + a; }
        return abc.call({ a: 4 }, "b");
    `.expectToMatchJsResult();
});

test.each([
    "function fn() {}",
    "function fn(x, y, z) {}",
    "function fn(x, y, z, ...args) {}",
    "function fn(...args) {}",
    "function fn(this: void) {}",
    "function fn(this: void, x, y, z) {}",
    "function fnReference(x, y, z) {} const fn = fnReference;",
    "const wrap = (fn: (...args: any[]) => any) => (...args: any[]) => fn(...args); const fn = wrap((x, y, z) => {});",
])("function.length (%p)", declaration => {
    util.testFunction`
        ${declaration}
        return fn.length;
    `.expectToMatchJsResult();
});

test.each([tstl.LuaTarget.Lua50, tstl.LuaTarget.Lua51, tstl.LuaTarget.Universal])(
    "function.length unsupported (%p)",
    luaTarget => {
        util.testFunction`
            function fn() {}
            return fn.length;
        `
            .setOptions({ luaTarget })
            .expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]);
    }
);

test("Recursive function definition", () => {
    util.testFunction`
        function f() { return typeof f; };
        return f();
    `.expectToMatchJsResult();
});

test("Recursive function expression", () => {
    util.testFunction`
        let f = function() { return typeof f; };
        return f();
    `.expectToMatchJsResult();
});

test("Wrapped recursive function expression", () => {
    util.testFunction`
        function wrap<T>(fn: T) { return fn; }
        let f = wrap(function() { return typeof f; }); return f();
    `.expectToMatchJsResult();
});

test("Recursive arrow function", () => {
    util.testFunction`
        let f = () => typeof f;
        return f();
    `.expectToMatchJsResult();
});

test("Wrapped recursive arrow function", () => {
    util.testFunction`
        function wrap<T>(fn: T) { return fn; }
        let f = wrap(() => typeof f);
        return f();
    `.expectToMatchJsResult();
});

test("Object method declaration", () => {
    util.testFunction`
        let o = { v: 4, m(i: number): number { return this.v * i; } };
        return o.m(3);
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1266
test("Object method declaration used with non-null operator (#1266)", () => {
    util.testFunction`
        let o = { v: 4, m(i: number): number { return this.v * i; } };
        return o.m!(3);
    `.expectToMatchJsResult();
});

test.each([
    { args: ["bar"], expected: "foobar" },
    { args: ["baz", "bar"], expected: "bazbar" },
])("Function overload (%p)", ({ args, expected }) => {
    util.testFunction`
        class O {
            prop = "foo";
            method(s: string): string;
            method(this: void, s1: string, s2: string): string;
            method(s1: string) {
                if (typeof this === "string") {
                    return this + s1;
                }
                return this.prop + s1;
            }
        };
        const o = new O();
        return o.method(${util.formatCode(...args)});
    `.expectToEqual(expected);
});

test("Nested Function", () => {
    util.testFunction`
        class C {
            private prop = "bar";
            public outer() {
                const o = {
                    prop: "foo",
                    innerFunc: function() { return this.prop; },
                    innerArrow: () => this.prop
                };
                return o.innerFunc() + o.innerArrow();
            }
        }
        let c = new C();
        return c.outer();
    `.expectToMatchJsResult();
});

test.each([
    { s1: "abc", s2: "abc" },
    { s1: "abc", s2: "def" },
])("Dot vs Colon method call (%p)", ({ s1, s2 }) => {
    util.testFunction`
        class MyClass {
            dotMethod(this: void, s: string) {
                return s;
            }
            colonMethod(s: string) {
                return s;
            }
        }
        const inst = new MyClass();
        return inst.dotMethod("${s1}") == inst.colonMethod("${s2}");
    `.expectToMatchJsResult();
});

test("Element access call", () => {
    util.testFunction`
        class C {
            prop = "bar";
            method(s: string) { return s + this.prop; }
        }
        const c = new C();
        return c['method']("foo");
    `.expectToMatchJsResult();
});

test("Element access call no args", () => {
    util.testFunction`
        class C {
            prop = "bar";
            method() { return this.prop; }
        }
        const c = new C();
        return c['method']();
    `.expectToMatchJsResult();
});

test("Complex element access call", () => {
    util.testFunction`
        class C {
            prop = "bar";
            method(s: string) { return s + this.prop; }
        }
        function getC() { return new C(); }
        return getC()['method']("foo");
    `.expectToMatchJsResult();
});

test("Complex element access call no args", () => {
    util.testFunction`
        class C {
            prop = "bar";
            method() { return this.prop; }
        }
        function getC() { return new C(); }
        return getC()['method']();
    `.expectToMatchJsResult();
});

test("Complex element access call statement", () => {
    util.testFunction`
        let foo: string;
        class C {
            prop = "bar";
            method(s: string) { foo = s + this.prop; }
        }
        function getC() { return new C(); }
        getC()['method']("foo");
        return foo;
    `.expectToMatchJsResult();
});

test("Function local overriding export", () => {
    util.testModule`
        export const foo = 5;
        function bar(foo: number) {
            return foo;
        }
        export const result = bar(7);
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});

test("Function using global as this", () => {
    // Value is provided with top-level return with ts-ignore, because modules are always strict.
    // TODO: Provide a different builder kind for such tests?
    util.testModule`
        (globalThis as any).foo = "foo";
        function bar(this: any) {
            return this.foo;
        }

        // @ts-ignore
        return bar();
    `.expectToEqual("foo");
});

test("Function rest binding pattern", () => {
    util.testFunction`
        function bar(foo: string, ...[bar, baz]: [string, string]) {
            return bar + baz + foo;
        }
        return bar("abc", "def", "xyz");
    `.expectToMatchJsResult();
});

test("Function rest parameter", () => {
    util.testFunction`
        function foo(a: unknown, ...b: string[]) {
            return b.join("");
        }
        return foo("A", "B", "C", "D");
    `.expectToMatchJsResult();
});

test("Function nested rest parameter", () => {
    util.testFunction`
        function foo(a: unknown, ...b: string[]) {
            function bar() {
                return b.join("");
            }
            return bar();
        }
        return foo("A", "B", "C", "D");
    `.expectToMatchJsResult();
});

test("Function nested rest spread", () => {
    util.testFunction`
        function foo(a: unknown, ...b: string[]) {
            function bar() {
                const c = [...b];
                return c.join("");
            }
            return bar();
        }
        return foo("A", "B", "C", "D");
    `.expectToMatchJsResult();
});

test("Function rest parameter (unreferenced)", () => {
    util.testFunction`
        function foo(a: unknown, ...b: string[]) {
            return "foobar";
        }
        return foo("A", "B", "C", "D");
    `
        .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toMatch("{...}"))
        .expectToMatchJsResult();
});

test("Function rest parameter (referenced in property shorthand)", () => {
    util.testFunction`
        function foo(a: unknown, ...b: string[]) {
            const c = { b };
            return c.b.join("");
        }
        return foo("A", "B", "C", "D");
    `.expectToMatchJsResult();
});

test("named function expression reference", () => {
    util.testFunction`
        const y = function x() {
            return { x: typeof x, y: typeof y };
        };

        return y();
    `.expectToMatchJsResult();
});

test("missing declaration name", () => {
    util.testModule`
        function () {}
    `.expectDiagnosticsToMatchSnapshot([1003]);
});

test("top-level function declaration is global", () => {
    // Can't be tested with expectToMatchJsResult because in JS that would not be global
    util.testModule`
        import './a';
        export const result = foo();
    `
        .addExtraFile("a.ts", 'function foo() { return "foo" }')
        .expectToEqual({ result: "foo" });
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1325
test("call expression should not throw (#1325)", () => {
    util.testModule`
        function test<T>(iterator:Iterator<T>) {
            iterator.return?.();
        }
    `
        // Note: does not reproduce without strict=true
        .setOptions({ target: ts.ScriptTarget.ESNext, strict: true })
        .expectToHaveNoDiagnostics();
});
