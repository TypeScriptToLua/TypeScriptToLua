import * as util from "../util";

const compilerOptions = { lib: ["lib.es2015.d.ts", "lib.dom.d.ts"] };

test.each([
    { inp: "console.log()", expected: "print()" },
    { inp: 'console.log("Hello")', expected: 'print("Hello")' },
    { inp: 'console.log("Hello %s", "there")', expected: 'print(\n    string.format("Hello %s", "there")\n)' },
    { inp: 'console.log("Hello %%s", "there")', expected: 'print(\n    string.format("Hello %%s", "there")\n)' },
    { inp: 'console.log("Hello", "There")', expected: 'print("Hello", "There")' },
])("console.log (%p)", ({ inp, expected }) => {
    expect(util.transpileString(inp, compilerOptions)).toBe(expected);
});

test.each([
    {
        inp: "console.trace()",
        expected: "print(\n    debug.traceback()\n)",
    },
    {
        inp: 'console.trace("message")',
        expected: 'print(\n    debug.traceback("message")\n)',
    },
    {
        inp: 'console.trace("Hello %s", "there")',
        expected: 'print(\n    debug.traceback(\n        string.format("Hello %s", "there")\n    )\n)',
    },
    {
        inp: 'console.trace("Hello %%s", "there")',
        expected: 'print(\n    debug.traceback(\n        string.format("Hello %%s", "there")\n    )\n)',
    },
    {
        inp: 'console.trace("Hello", "there")',
        expected: 'print(\n    debug.traceback("Hello", "there")\n)',
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
        expected: 'assert(\n    false,\n    string.format("message %s", "info")\n)',
    },
    {
        inp: 'console.assert(false, "message %%s", "info")',
        expected: 'assert(\n    false,\n    string.format("message %%s", "info")\n)',
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
