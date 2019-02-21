import { Expect, Test, TestCase } from "alsatian";
import { LuaLibImportKind, LuaTarget } from "../../src/CompilerOptions";

import * as ts from "typescript";
import * as util from "../src/util";

export class LuaModuleTests {

    @Test("defaultImport")
    public defaultImport(): void {
        Expect(() => {
            const lua = util.transpileString(`import TestClass from "test"`);
        }).toThrowError(Error, "Default Imports are not supported, please use named imports instead!");
    }

    @Test("lualibRequire")
    public lualibRequire(): void {
        // Transpile
        const lua = util.transpileString(`let a = b instanceof c;`,
                                         { luaLibImport: LuaLibImportKind.Require, luaTarget: LuaTarget.LuaJIT });

        // Assert
        Expect(lua.startsWith(`require("lualib_bundle")`));
    }

    @Test("lualibRequireAlways")
    public lualibRequireAlways(): void {
        // Transpile
        const lua = util.transpileString(``, { luaLibImport: LuaLibImportKind.Always, luaTarget: LuaTarget.LuaJIT });

        // Assert
        Expect(lua).toBe(`require("lualib_bundle");`);
    }

    @Test("Non-exported module")
    public nonExportedModule(): void {
        const result = util.transpileAndExecute(
            "return g.test();",
            undefined,
            undefined,
            "module g { export function test() { return 3; } }" // Typescript header
        );

        Expect(result).toBe(3);
    }

    @TestCase(LuaLibImportKind.Inline)
    @TestCase(LuaLibImportKind.None)
    @TestCase(LuaLibImportKind.Require)
    @Test("LuaLib no uses? No code")
    public lualibNoUsesNoCode(impKind: LuaLibImportKind): void {
        // Transpile
        const lua = util.transpileString(``, { luaLibImport: impKind });

        // Assert
        Expect(lua).toBe(``);
    }

    @Test("Nested module with dot in name")
    public nestedModuleWithDotInName(): void {
        const code =
            `module a.b {
                export const foo = "foo";
            }`;
        Expect(util.transpileAndExecute("return a.b.foo;", undefined, undefined, code)).toBe("foo");
    }
}
