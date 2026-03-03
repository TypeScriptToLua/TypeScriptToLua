import * as util from "../util";
import * as tstl from "../../src";

test("throwString", () => {
    util.testFunction`
        throw "Some Error"
    `.expectToEqual(new util.ExecutionError("Some Error"));
});

// TODO: Finally does not behave like it should, see #1137
// eslint-disable-next-line jest/no-disabled-tests
test.skip.each([0, 1, 2])("re-throw (%p)", i => {
    util.testFunction`
        const i: number = ${i};
        function foo() {
            try {
                try {
                    if (i === 0) { throw "z"; }
                } catch (e) {
                    throw "a";
                } finally {
                    if (i === 1) { throw "b"; }
                }
            } catch (e) {
                throw (e as string).toUpperCase();
            } finally {
                throw "C";
            }
        }
        let result: string = "x";
        try {
            foo();
        } catch (e) {
            result = (e as string)[(e as string).length - 1];
        }
        return result;
    `.expectToMatchJsResult();
});

test("re-throw (no catch var)", () => {
    util.testFunction`
        let result = "x";
        try {
            try {
                throw "y";
            } catch {
                throw "z";
            }
        } catch (e) {
            result = (e as string)[(e as string).length - 1];
        }
        return result;
    `.expectToMatchJsResult();
});

test("return from try", () => {
    util.testFunction`
        function foobar() {
            try {
                return "foobar";
            } catch {
            }
        }
        return foobar();
    `.expectToMatchJsResult();
});

test("return nil from try", () => {
    util.testFunction`
        let x = "unset";
        function foobar() {
            try {
                return;
            } catch {
            }
            x = "set";
        }
        foobar();
        return x;
    `.expectToMatchJsResult();
});

test("multi return from try", () => {
    const testBuilder = util.testFunction`
        function foobar() {
            try {
                return $multi("foo", "bar");
            } catch {
            }
        }
        const [foo, bar] = foobar();
        return foo + bar;
    `.withLanguageExtensions();
    expect(testBuilder.getMainLuaCodeChunk()).not.toMatch("unpack(foobar");
    testBuilder.expectToMatchJsResult();
});

test("return from catch", () => {
    util.testFunction`
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                return e + " catch";
            }
        }
        return foobar();
    `.expectToMatchJsResult();
});

test("return nil from catch", () => {
    util.testFunction`
        let x = "unset";
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                return;
            }
            x = "set";
        }
        foobar();
        return x;
    `.expectToMatchJsResult();
});

test("multi return from catch", () => {
    const testBuilder = util.testFunction`
        function foobar(): LuaMultiReturn<[string, string]> {
            try {
                throw "foobar";
            } catch (e) {
                return $multi(e.toString(), " catch");
            }
        }
        const [foo, bar] = foobar();
        return foo + bar;
    `.withLanguageExtensions();
    expect(testBuilder.getMainLuaCodeChunk()).not.toMatch("unpack(foobar");
    testBuilder.expectToMatchJsResult();
});

test("return from nested try", () => {
    util.testFunction`
        function foobar() {
            try {
                try {
                    return "foobar";
                } catch {
                }
            } catch {
            }
        }
        return foobar();
    `.expectToMatchJsResult();
});

test("return from nested catch", () => {
    util.testFunction`
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                try {
                    throw e + " catch1";
                } catch (f) {
                    return f + " catch2";
                }
            }
        }
        return foobar();
    `.expectToMatchJsResult();
});

test("return from try->finally", () => {
    util.testFunction`
        let x = "unevaluated";
        function evaluate(arg: unknown) {
            x = "evaluated";
            return arg;
        }
        function foobar() {
            try {
                return evaluate("foobar");
            } catch {
            } finally {
                return "finally";
            }
        }
        return foobar() + " " + x;
    `.expectToMatchJsResult();
});

test("return from catch->finally", () => {
    util.testFunction`
        let x = "unevaluated";
        function evaluate(arg: unknown) {
            x = "evaluated";
            return arg;
        }
        function foobar() {
            try {
                throw "foobar";
            } catch (e) {
                return evaluate(e);
            } finally {
                return "finally";
            }
        }
        return foobar() + " " + x;
    `.expectToMatchJsResult();
});

test("multi return from try->finally", () => {
    util.testFunction`
        let x = "unevaluated";
        function evaluate(arg: string) {
            x = "evaluated";
            return arg;
        }
        function foobar() {
            try {
                return $multi(evaluate("foo"), "bar");
            } catch {
            } finally {
                return $multi("final", "ly");
            }
        }
        const [foo, bar] = foobar();
        return foo + bar + " " + x;
    `
        .withLanguageExtensions()
        .expectToMatchJsResult();
});

test("multi return from catch->finally", () => {
    util.testFunction`
        let x = "unevaluated";
        function evaluate(arg: string) {
            x = "evaluated";
            return arg;
        }
        function foobar() {
            try {
                throw "foo";
            } catch (e) {
                return $multi(evaluate(e), "bar");
            } finally {
                return $multi("final", "ly");
            }
        }
        const [foo, bar] = foobar();
        return foo + bar + " " + x;
    `
        .withLanguageExtensions()
        .expectToMatchJsResult();
});

test("return from nested finally", () => {
    util.testFunction`
        let x = "";
        function foobar() {
            try {
                try {
                } finally {
                    x += "A";
                    return "foobar";
                }
            } finally {
                x += "B";
                return "finally";
            }
        }
        return foobar() + " " + x;
    `.expectToMatchJsResult();
});

test.each([
    '"error string"',
    "42",
    "3.141",
    "true",
    "false",
    "undefined",
    '{ x: "error object" }',
    '() => "error function"',
])("throw and catch %s", error => {
    util.testFunction`
        try {
            throw ${error};
        } catch (error) {
            if (typeof error == 'function') {
                return error();
            } else {
                return error;
            }
        }
    `.expectToMatchJsResult();
});

const builtinErrors = ["Error", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"];

test.each([...builtinErrors, ...builtinErrors.map(type => `new ${type}`)])("%s properties", errorType => {
    util.testFunction`
        const error = ${errorType}();
        return { name: error.name, message: error.message, string: error.toString() };
    `.expectToMatchJsResult();
});

test.each([...builtinErrors, "CustomError"])("get stack from %s", errorType => {
    const stack = util.testFunction`
        class CustomError extends Error {
            public name = "CustomError";
        }

        let stack: string | undefined;

        function innerFunction() { stack = new ${errorType}().stack; }
        function outerFunction() { innerFunction(); }
        outerFunction();

        return stack;
    `.getLuaExecutionResult();

    expect(stack).toMatch("innerFunction");
    expect(stack).toMatch("outerFunction");
});

test("still works without debug module", () => {
    util.testFunction`
        try
        {
            throw new Error("hello, world");
        }
        catch (e)
        {
            return e;
        }
    `
        .setLuaHeader("debug = nil")
        .expectToEqual({
            message: "hello, world",
            name: "Error",
            stack: undefined,
        });
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1665
test("sourceMapTraceback maps anonymous function locations in .lua files (#1665)", () => {
    // Nested IIFEs produce <file.lua:N> anonymous function notation in traceback.
    // Old pattern (%S+)%.lua:(%d+) captures "<main" from "<main.lua:4>",
    // failing the sourcemap lookup. Fix: ([^%s<]+) excludes "<".

    // mapping is copied from the emitted Lua, not invented.
    const mapping = `{["5"] = 1,["6"] = 2,["7"] = 3,["8"] = 4,["9"] = 3,["10"] = 2,["11"] = 1}`;

    // Test harness executes via luaL_dostring (chunk names are [string "..."]), so we mock a file-based traceback.
    const fakeTraceback = [
        "stack traceback:",
        "\tmain.lua:8: in function <main.lua:7>",
        "\tmain.lua:7: in function <main.lua:6>",
        "\t[C]: in ?",
    ].join("\n");

    // Inject sourcemap for "main.lua" and mock debug.traceback to return file-based frames.
    const header = `
        __TS__sourcemap = { ["main.lua"] = ${mapping} };
        local __real_tb = debug.traceback
        debug.traceback = function() return ${JSON.stringify(fakeTraceback)} end
    `;

    const builder = util.testFunction`
        return (() => {
            return (() => {
                return (debug.traceback as (this: void) => string)();
            })();
        })();
    `
        .setLuaHeader(header)
        .setOptions({ sourceMapTraceback: true });

    const lua = builder.getMainLuaCodeChunk();
    // Sanity check: emitted code registers the same mapping literal we inject above.
    expect(lua).toContain(`__TS__SourceMapTraceBack(debug.getinfo(1).short_src, ${mapping});`);

    const result = builder.getLuaExecutionResult();
    expect(result).toEqual(expect.any(String));
    // Both `main.lua:N` and `<main.lua:N>` frames should be rewritten using the sourcemap.
    expect(result).not.toContain("main.lua");
    // Regular line references
    expect(result).toContain("\tmain.ts:4:");
    expect(result).toContain("\tmain.ts:3:");
    // Anonymous function references must keep <> format
    expect(result).toContain("<main.ts:3>");
    expect(result).toContain("<main.ts:2>");
});

util.testEachVersion(
    "error stacktrace omits constructor and __TS_New",
    () => util.testFunction`
        const e = new Error();
        return e.stack;
    `,
    {
        ...util.expectEachVersionExceptJit(builder => {
            builder.expectToHaveNoDiagnostics();
            const luaResult = builder.getLuaExecutionResult();
            // eslint-disable-next-line jest/no-standalone-expect
            expect(luaResult.split("\n")).toHaveLength(4);
        }),

        // 5.0 debug.traceback doesn't support levels
        [tstl.LuaTarget.Lua50](builder) {
            builder.expectToHaveNoDiagnostics();
            const luaResult = builder.getLuaExecutionResult();
            // eslint-disable-next-line jest/no-standalone-expect
            expect(luaResult).toContain("Level 4");
        },
    }
);
