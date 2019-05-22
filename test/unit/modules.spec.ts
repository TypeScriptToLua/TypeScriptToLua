import * as tstl from "../../src";
import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

describe("module import/export elision", () => {
    const moduleDeclaration = `
        declare module "module" {
            export type Type = string;
            export declare const value: string;
        }
    `;

    const expectToElideImport = (code: string) => {
        const lua = util.transpileString(
            { "module.d.ts": moduleDeclaration, "main.ts": code },
            undefined,
            false,
        );

        expect(() => util.executeLua(lua)).not.toThrow();
    };

    test("should elide named type imports", () => {
        expectToElideImport(`
            import { Type } from "module";
            const foo: Type = "bar";
        `);
    });

    test("should elide named value imports used only as a type", () => {
        expectToElideImport(`
            import { value } from "module";
            const foo: typeof value = "bar";
        `);
    });

    test("should elide namespace imports with unused values", () => {
        expectToElideImport(`
            import * as module from "module";
            const foo: module.Type = "bar";
        `);
    });

    test("should elide type exports", () => {
        const code = `
            declare const _G: any;

            _G.foo = true;
            type foo = boolean;
            export { foo };
        `;

        expect(util.transpileExecuteAndReturnExport(code, "foo")).toBeUndefined();
    });
});

test.each([
    "export { default } from '...'",
    "export { x as default } from '...';",
    "export { default as x } from '...';",
])("Export default keyword disallowed (%p)", exportStatement => {
    expect(() => util.transpileString(exportStatement)).toThrowExactError(
        TSTLErrors.UnsupportedDefaultExport(util.nodeStub),
    );
});

test.each(["ke-bab", "dollar$", "singlequote'", "hash#", "s p a c e", "ɥɣɎɌͼƛಠ", "_̀ः٠‿"])(
    "Import module names with invalid lua identifier characters (%p)",
    name => {
        const code = `
            import { foo } from "${name}";
            foo;
        `;

        const lua = `
            setmetatable(package.loaded, {__index = function() return {foo = "bar"} end})
            ${util.transpileString(code)}
            return foo;`;

        expect(util.executeLua(lua)).toBe("bar");
    },
);

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
