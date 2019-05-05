import * as tstl from "../../src";
import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

test("defaultImport", () => {
    expect(() => {
        util.transpileString(`import TestClass from "test"`);
    }).toThrowExactError(TSTLErrors.DefaultImportsNotSupported(util.nodeStub));
});

test("lualibRequire", () => {
    const lua = util.transpileString(`let a = b instanceof c;`, {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.LuaJIT,
    });

    expect(lua.startsWith(`require("lualib_bundle")`));
});

test("lualibRequireAlways", () => {
    const lua = util.transpileString(``, {
        luaLibImport: tstl.LuaLibImportKind.Always,
        luaTarget: tstl.LuaTarget.LuaJIT,
    });

    expect(lua).toBe(`require("lualib_bundle");`);
});

test("Non-exported module", () => {
    const result = util.transpileAndExecute(
        "return g.test();",
        undefined,
        undefined,
        "module g { export function test() { return 3; } }",
    );

    expect(result).toBe(3);
});

test.each([
    tstl.LuaLibImportKind.Inline,
    tstl.LuaLibImportKind.None,
    tstl.LuaLibImportKind.Require,
])("LuaLib no uses? No code (%p)", luaLibImport => {
    const lua = util.transpileString(``, { luaLibImport });

    expect(lua).toBe(``);
});

test("Nested module with dot in name", () => {
    const code = `module a.b {
            export const foo = "foo";
        }`;
    expect(util.transpileAndExecute("return a.b.foo;", undefined, undefined, code)).toBe("foo");
});

test("Access this in module", () => {
    const header = `
        module M {
            export const foo = "foo";
            export function bar() { return this.foo + "bar"; }
        }
    `;
    const code = `return M.bar();`;
    expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe("foobar");
});

test("Module merged with interface", () => {
    const header = `
        interface Foo {}
        module Foo {
            export function bar() { return "foobar"; }
        }`;
    const code = `return Foo.bar();`;
    expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe("foobar");
});
