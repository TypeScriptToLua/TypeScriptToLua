import * as util from "../util";

test.each(['{ a: 3, b: "4" }', '{ "a": 3, b: "4" }', '{ ["a"]: 3, b: "4" }', '{ ["a" + 123]: 3, b: "4" }'])(
    "Object Literal (%p)",
    inp => {
        util.testExpression(inp).expectToMatchJsResult();
    }
);

test("object literal with function call to get key", () => {
    util.testFunction`
        const myFunc = () => "a";
        return { [myFunc() + "b"]: 3 };
    `.expectToMatchJsResult();
});

test("object literal with shorthand property", () => {
    util.testFunction`
        const x = 5;
        return { x };
    `.expectToMatchJsResult();
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
            .setTsHeader("declare const _G: any;")
            .setLuaHeader('foobar = "foobar"')
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

test.each(['{x: "foobar"}.x', '{x: "foobar"}["x"]', '{x: () => "foobar"}.x()', '{x: () => "foobar"}["x"]()'])(
    "object literal property access (%p)",
    expression => {
        util.testExpression(expression).expectToMatchJsResult();
    }
);
