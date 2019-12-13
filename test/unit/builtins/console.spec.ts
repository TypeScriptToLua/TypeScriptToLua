import * as util from "../../util";

const compilerOptions = { lib: ["lib.esnext.d.ts", "lib.dom.d.ts"] };

test.each([
    "console.log()",
    'console.log("Hello")',
    'console.log("Hello %s", "there")',
    'console.log("Hello %%s", "there")',
    'console.log("Hello", "There")',
])("console.log (%p)", code => {
    util.testFunction(code)
        .setOptions(compilerOptions)
        .expectLuaToMatchSnapshot();
});

test.each([
    "console.info()",
    'console.info("Hello")',
    'console.info("Hello %s", "there")',
    'console.info("Hello %%s", "there")',
    'console.info("Hello", "There")',
])("console.info (%p)", code => {
    util.testFunction(code)
        .setOptions(compilerOptions)
        .expectLuaToMatchSnapshot();
});

test.each([
    "console.error()",
    'console.error("Hello")',
    'console.error("Hello %s", "there")',
    'console.error("Hello %%s", "there")',
    'console.error("Hello", "There")',
])("console.error (%p)", code => {
    util.testFunction(code)
        .setOptions(compilerOptions)
        .expectLuaToMatchSnapshot();
});

test.each([
    "console.warn()",
    'console.warn("Hello")',
    'console.warn("Hello %s", "there")',
    'console.warn("Hello %%s", "there")',
    'console.warn("Hello", "There")',
])("console.warn (%p)", code => {
    util.testFunction(code)
        .setOptions(compilerOptions)
        .expectLuaToMatchSnapshot();
});

test.each([
    "console.trace()",
    'console.trace("message")',
    'console.trace("Hello %s", "there")',
    'console.trace("Hello %%s", "there")',
    'console.trace("Hello", "there")',
])("console.trace (%p)", code => {
    util.testFunction(code)
        .setOptions(compilerOptions)
        .expectLuaToMatchSnapshot();
});

test.each([
    "console.assert(false)",
    'console.assert(false, "message")',
    'console.assert(false, "message %s", "info")',
    'console.assert(false, "message %%s", "info")',
    'console.assert(false, "message", "more")',
])("console.assert (%p)", code => {
    util.testFunction(code)
        .setOptions(compilerOptions)
        .expectLuaToMatchSnapshot();
});

test("console.differentiation", () => {
    util.testModule`
        export class Console {
            public test() {
                return 42;
            }
        }

        function test() {
            const console = new Console();
            return console.test();
        }

        export const result = test();
    `
        .setReturnExport("result")
        .expectToMatchJsResult();
});
