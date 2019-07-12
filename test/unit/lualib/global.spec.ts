import * as util from "../../util";

describe("globalThis", () => {
    // https://github.com/TypeScriptToLua/TypeScriptToLua/issues/660
    test.skip("equals _G", () => {
        util.testExpression`_G`
            .setTsHeader("declare global { const _G: typeof globalThis }")
            .debug()
            .expectToEqual(true);
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
});
