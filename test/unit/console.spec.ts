import * as util from "../util";

const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

test.each([
    { inp: "console.log()", expected: "print()" },
    { inp: 'console.log("Hello")', expected: 'print("Hello")' },
    { inp: 'console.log("Hello %s", "there")', expected: 'print(string.format("Hello %s", "there"))' },
    { inp: 'console.log("Hello %%s", "there")', expected: 'print(string.format("Hello %%s", "there"))' },
    { inp: 'console.log("Hello", "There")', expected: 'print("Hello", "There")' },
])("console.log (%p)", ({ inp, expected }) => {
    expect(util.transpileString(inp, compilerOptions)).toBe(expected);
});

test.each([
    {
        inp: "console.trace()",
        expected: "print(debug.traceback())",
    },
    {
        inp: 'console.trace("message")',
        expected: 'print(debug.traceback("message"))',
    },
    {
        inp: 'console.trace("Hello %s", "there")',
        expected: 'print(debug.traceback(string.format("Hello %s", "there")))',
    },
    {
        inp: 'console.trace("Hello %%s", "there")',
        expected: 'print(debug.traceback(string.format("Hello %%s", "there")))',
    },
    {
        inp: 'console.trace("Hello", "there")',
        expected: 'print(debug.traceback("Hello", "there"))',
    },
])("console.trace (%p)", ({ inp, expected }) => {
    expect(util.transpileString(inp, compilerOptions)).toBe(expected);
});

test.each([
    {
        inp: "console.assert(false)",
        expected: "assert(false)",
    },
    {
        inp: 'console.assert(false, "message")',
        expected: 'assert(false, "message")',
    },
    {
        inp: 'console.assert(false, "message %s", "info")',
        expected: 'assert(false, string.format("message %s", "info"))',
    },
    {
        inp: 'console.assert(false, "message %%s", "info")',
        expected: 'assert(false, string.format("message %%s", "info"))',
    },
    {
        inp: 'console.assert(false, "message", "more")',
        expected: 'assert(false, "message", "more")',
    },
])("console.assert (%p)", ({ inp, expected }) => {
    expect(util.transpileString(inp, compilerOptions)).toBe(expected);
});

test("console.differentiation", () => {
    const result = util.transpileExecuteAndReturnExport(
        `
            export class Console {
                test() { return 42; }
            }

            function test() {
                const console = new Console();
                return console.test();
            }

            export const result = test();
        `,
        "result",
        compilerOptions
    );
    expect(result).toBe(42);
});
