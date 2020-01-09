import * as util from "../util";

test.each([
    { inp: `{a:3,b:"4"}`, out: '{a = 3, b = "4"}' },
    { inp: `{"a":3,b:"4"}`, out: '{a = 3, b = "4"}' },
    { inp: `{["a"]:3,b:"4"}`, out: '{a = 3, b = "4"}' },
    { inp: `{["a"+123]:3,b:"4"}`, out: '{["a" .. 123] = 3, b = "4"}' },
    { inp: `{[myFunc()]:3,b:"4"}`, out: '{\n    [myFunc(_G)] = 3,\n    b = "4"\n}' },
    { inp: `{x}`, out: `{x = x}` },
])("Object Literal (%p)", ({ inp, out }) => {
    const lua = util.testModule`const myvar = ${inp};`.getMainLuaCodeChunk();
    expect(lua).toBe(`myvar = ${out}`);
});

describe("property shorthand", () => {
    test("should support property shorthand", () => {
        util.testFunction`
            const x = 1;
            const o = { x };
            return o.x;
        `.expectToMatchJsResult();
    });

    test.each([NaN, Infinity])("should support %p shorthand", identifier => {
        util.testExpression`({ ${identifier} }).${identifier}`.expectToMatchJsResult();
    });

    test("should support _G shorthand", () => {
        util.testExpression`({ _G })._G.foobar`
            .setTsHeader(`declare const _G: any;`)
            .setLuaHeader(`foobar = "foobar"`)
            .expectToEqual("foobar");
    });

    test("should support export property shorthand", () => {
        util.testModule`
            export const x = 1;
            const o = { x };
            export const y = o.x;
        `.expectToMatchJsResult();
    });
});

test("undefined as object key", () => {
    util.testFunction`
        const foo = {undefined: "foo"};
        return foo.undefined;
    `.expectToMatchJsResult();
});

test.each([`({x: "foobar"}.x)`, `({x: "foobar"}["x"])`, `({x: () => "foobar"}.x())`, `({x: () => "foobar"}["x"]())`])(
    "object literal property access (%p)",
    expression => {
        util.testExpression(expression).expectToMatchJsResult();
    }
);
