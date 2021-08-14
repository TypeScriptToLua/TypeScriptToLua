import { notAllowedOptionalAssignment } from "../../src/transformation/utils/diagnostics";
import * as util from "../util";

test.each(["null", "undefined", '{ foo: "foo" }'])("optional chaining (%p)", value => {
    util.testFunction`
        const obj: any = ${value};
        return obj?.foo;
    `.expectToMatchJsResult();
});

test("long optional chain", () => {
    util.testFunction`
        const a = { b: { c: { d: { e: { f: "hello!"}}}}};
        return a.b?.c?.d.e.f;
    `.expectToMatchJsResult();
});

test.each(["undefined", "{}", "{ foo: {} }", "{ foo: {bar: 'baz'}}"])("nested optional chaining (%p)", value => {
    util.testFunction`
        const obj: { foo?: { bar?: string } } | undefined = ${value};
        return obj?.foo?.bar;
    `.expectToMatchJsResult();
});

test.each(["undefined", "{}", "{ foo: {} }", "{ foo: {bar: 'baz'}}"])(
    "nested optional chaining combined with coalescing (%p)",
    value => {
        util.testFunction`
        const obj: { foo?: { bar?: string } } | undefined = ${value};
        return obj?.foo?.bar ?? "not found";
    `.expectToMatchJsResult();
    }
);

test.each(["[1, 2, 3, 4]", "undefined"])("optional array access (%p)", value => {
    util.testFunction`
        const arr: number[] | undefined = ${value};
        return arr?.[2];
    `.expectToMatchJsResult();
});

test.each(["[1, [2, [3, [4, 5]]]]", "[1, [2, [3, undefined]]] ", "[1, undefined]"])(
    "optional element access nested (%p)",
    value => {
        util.testFunction`
        const arr: [number, [number, [number, [number, number] | undefined]]] | [number, undefined] = ${value};
        return arr[1]?.[1][1]?.[0];
    `.expectToMatchJsResult();
    }
);

test.each(["{ }", "{ a: { } }", "{ a: { b: [{ c: 10 }] } }"])(
    "optional nested element access properties (%p)",
    value => {
        util.testFunction`
        const obj: {a?: {b?: Array<{c: number }> } } = ${value};
        return [obj["a"]?.["b"]?.[0]?.["c"] ?? "not found", obj["a"]?.["b"]?.[2]?.["c"] ?? "not found"];
    `.expectToMatchJsResult();
    }
);

test("optional element function calls", () => {
    util.testFunction`
        const obj: { value: string; foo?(this: void, v: number): number; bar?(this: void, v: number): number; } = {
            value: "foobar",
            foo: (v: number) => v + 10
        }
        const fooKey = "foo";
        const barKey = "bar";
        return obj[barKey]?.(5) ?? obj[fooKey]?.(15);
    `.expectToMatchJsResult();
});

test("optional element access method calls", () => {
    util.testFunction`
        const obj: { value: string; foo?(prefix: string): string; bar?(prefix: string): string; } = {
            value: "foobar",
            foo(prefix: string) { return prefix + this.value; }
        }
        const fooKey = "foo";
        const barKey = "bar";
        return obj[barKey]?.("bar?") ?? obj[fooKey]?.("foo?");
    `.expectToMatchJsResult();
});

test("no side effects", () => {
    util.testFunction`
        function getFoo(): { foo: number } | undefined {
            return { foo: 42 };
        }
        let barCalls = 0;
        function getBar(): { bar: number } | undefined {
            barCalls += 1;
            return undefined;
        }
        const result = getFoo()?.foo ?? getBar()?.bar;
        return { result, barCalls };
    `.expectToMatchJsResult();
});

// Test for https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1044
test("does not crash when incorrectly used in assignment (#1044)", () => {
    const { diagnostics } = util.testFunction`
        foo?.bar = "foo";
    `.getLuaResult();

    expect(diagnostics.find(d => d.code === notAllowedOptionalAssignment.code)).toBeDefined();
});

describe("optional chaining function calls", () => {
    test.each(["() => 4", "undefined"])("stand-alone optional function (%p)", value => {
        util.testFunction`
            const f: (() => number) | undefined = ${value};
            return f?.();
        `.expectToMatchJsResult();
    });

    test("methods present", () => {
        util.testFunction`
            const objWithMethods = {
                foo() {
                    return 3;
                },
                bar(this: void) {
                    return 5;
                }
            };

            return [objWithMethods?.foo(), objWithMethods?.bar()];
        `.expectToMatchJsResult();
    });

    test("object with method can be undefined", () => {
        util.testFunction`
            const objWithMethods: { foo: () => number, bar: (this: void) => number } | undefined = undefined;
            return [objWithMethods?.foo() ?? "no foo", objWithMethods?.bar() ?? "no bar"];
        `.expectToMatchJsResult();
    });

    test("nested optional method call", () => {
        util.testFunction`
            type typeWithOptional = { a?: { b: { c: () => number } } };

            const objWithMethods: typeWithOptional = {};
            const objWithMethods2: typeWithOptional = { a: { b: { c: () => 4 } } };

            return { 
                expectNil: objWithMethods.a?.b.c(), 
                expectFour: objWithMethods2.a?.b.c()
            };
        `.expectToMatchJsResult();
    });

    test("methods are undefined", () => {
        util.testFunction`
            const objWithMethods: { foo?: () => number, bar?: (this: void) => number } = {};
            return [objWithMethods.foo?.() ?? "no foo", objWithMethods.bar?.() ?? "no bar"];
        `.expectToMatchJsResult();
    });

    test("optional method of optional method result", () => {
        util.testFunction`
            const obj: { a?: () => {b: {c?: () => number }}} = {};
            const obj2: { a?: () => {b: {c?: () => number }}} = { a: () => ({b: {}})};
            const obj3: { a?: () => {b: {c?: () => number }}} = { a: () => ({b: { c: () => 5 }})};

            return [obj.a?.().b.c?.() ?? "nil", obj2.a?.().b.c?.() ?? "nil", obj3.a?.().b.c?.() ?? "nil"];
        `.expectToMatchJsResult();
    });
});
