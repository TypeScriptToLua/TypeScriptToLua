import * as util from "../../util";

test("equals _G", () => {
    util.testExpression`globalThis === _G`.setTsHeader("declare const _G: typeof globalThis;").expectToEqual(true);
});

test("registers global symbol", () => {
    util.testFunction`
        globalThis.foo = "bar";
        return foo;
    `
        .setTsHeader("declare global { var foo: string }")
        .expectToEqual("bar");
});

test("uses global symbol", () => {
    util.testFunction`
        foo = "bar";
        return globalThis.foo;
    `
        .setTsHeader("declare global { var foo: string }")
        .expectToEqual("bar");
});

test("function call", () => {
    util.testFunction`
        foo = () => "bar";
        return globalThis.foo();
    `
        .setTsHeader("declare global { var foo: () => string }")
        .expectToEqual("bar");
});
