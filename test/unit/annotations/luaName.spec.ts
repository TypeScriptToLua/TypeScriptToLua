import { annotationInvalidArgumentCount } from "../../../src/transformation/utils/diagnostics";
import * as util from "../../util";

test("LuaName.FunctionCall", () => {
    const luaHeader = `
        function bar(str)
            return str
        end
    `;

    const tsHeader = `
        /** @noSelf @luaName bar */
        declare function foo(str: string): string
    `;

    const result = util.transpileAndExecute("return foo('hi');", undefined, luaHeader, tsHeader);

    expect(result).toBe("hi");
});

test("LuaName.MethodCall", () => {
    const luaHeader = `
        local foo = {}
        function foo:baz(str)
            return str
        end
    `;

    const tsHeader = `
        declare namespace foo {
            /** @luaName baz */
            function bar(str: string): string
        }
    `;

    const result = util.transpileAndExecute("return foo.bar('hi');", undefined, luaHeader, tsHeader);

    expect(result).toBe("hi");
});

test("LuaName.Namespace", () => {
    const luaHeader = `
        local foo = {}
        function foo:baz(str)
            return str
        end
    `;

    const tsHeader = `
        /** @luaName foo */
        declare namespace bar {
            function baz(str: string): string
        }
    `;

    const result = util.transpileAndExecute("return bar.baz('hi');", undefined, luaHeader, tsHeader);

    expect(result).toBe("hi");
});

test("LuaName.Variable", () => {
    const luaHeader = `
        local foo = 'hi'
    `;

    const tsHeader = `
        /** @luaName foo */
        declare const bar: string;
    `;

    const result = util.transpileAndExecute("return bar;", undefined, luaHeader, tsHeader);

    expect(result).toBe("hi");
});

test("LuaName.Field", () => {
    const luaHeader = `
        local foo = {
            baz = 'hi'
        }
    `;

    const tsHeader = `
        declare const foo = {
            /** @luaName baz */
            bar: string
        }
    `;

    const result = util.transpileAndExecute("return foo.bar;", undefined, luaHeader, tsHeader);

    expect(result).toBe("hi");
});

test("IncorrectUsage", () => {
    util.testFunction`
        /** @luaName */
        declare function foo(str: string): string

        foo('hi');
    `.expectDiagnosticsToMatchSnapshot([annotationInvalidArgumentCount.code]);
});
