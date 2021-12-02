import * as util from "../../util";

test("property on function", () => {
    util.testFunction`
        function foo(s: string) { return s; }
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("property on void function", () => {
    util.testFunction`
        function foo(this: void, s: string) { return s; }
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("property on recursively referenced function", () => {
    util.testFunction`
        function foo(s: string) { return s + foo.bar; }
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("property on hoisted function", () => {
    util.testFunction`
        foo.bar = "bar";
        function foo(s: string) { return s; }
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("function merged with namespace", () => {
    util.testModule`
        function foo(s: string) { return s; }
        namespace foo {
            export let bar = "bar";
        }
        export const result = foo("foo") + foo.bar;
    `
        .setReturnExport("result")
        .expectToEqual("foobar");
});

test("function with property assigned to variable", () => {
    util.testFunction`
        const foo = function(s: string) { return s; };
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("void function with property assigned to variable", () => {
    util.testFunction`
        const foo = function(this: void, s: string) { return s; };
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("recursively referenced function with property assigned to variable", () => {
    util.testFunction`
        const foo = function(s: string) { return s + foo.bar; };
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("named recursively referenced function with property assigned to variable", () => {
    util.testFunction`
        const foo = function baz(s: string) { return s + foo.bar + baz.bar; };
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("arrow function with property assigned to variable", () => {
    util.testFunction`
        const foo: { (s: string): string; bar: string; } = s => s;
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("void arrow function with property assigned to variable", () => {
    util.testFunction`
        const foo: { (this: void, s: string): string; bar: string; } = s => s;
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("recursively referenced arrow function with property assigned to variable", () => {
    util.testFunction`
        const foo: { (s: string): string; bar: string; } = s => s + foo.bar;
        foo.bar = "bar";
        return foo("foo") + foo.bar;
    `.expectToMatchJsResult();
});

test("property on generator function", () => {
    util.testFunction`
        function *foo(s: string) { yield s; }
        foo.bar = "bar";
        for (const s of foo("foo")) {
            return s + foo.bar;
        }
    `.expectToMatchJsResult();
});

test("generator function assigned to variable", () => {
    util.testFunction`
        const foo = function *(s: string) { yield s; }
        foo.bar = "bar";
        for (const s of foo("foo")) {
            return s + foo.bar;
        }
    `.expectToMatchJsResult();
});

test("property on async function", () => {
    util.testFunction`
        let result = "";
        async function foo(s: string) { result = s + foo.bar; }
        foo.bar = "bar";
        void foo("foo");
        return result;
    `.expectToMatchJsResult();
});

test("async function with property assigned to variable", () => {
    util.testFunction`
        let result = "";
        const foo = async function(s: string) { result = s + foo.bar; }
        foo.bar = "bar";
        void foo("foo");
        return result;
    `.expectToMatchJsResult();
});

test("async arrow function with property assigned to variable", () => {
    util.testFunction`
        let result = "";
        const foo: { (s: string): Promise<void>; bar: string; } = async s => { result = s + foo.bar; };
        foo.bar = "bar";
        void foo("foo");
        return result;
    `.expectToMatchJsResult();
});

test("call function with property using call method", () => {
    util.testFunction`
        function foo(s: string) { return this + s; }
        foo.baz = "baz";
        return foo.call("foo", "bar") + foo.baz;
    `.expectToMatchJsResult();
});

test("call function with property using apply method", () => {
    util.testFunction`
        function foo(s: string) { return this + s; }
        foo.baz = "baz";
        return foo.apply("foo", ["bar"]) + foo.baz;
    `.expectToMatchJsResult();
});

test("call function with property using bind method", () => {
    util.testFunction`
        function foo(s: string) { return this + s; }
        foo.baz = "baz";
        return foo.bind("foo", "bar")() + foo.baz;
    `.expectToMatchJsResult();
});
