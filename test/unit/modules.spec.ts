import { Expect, Test, TestCase } from "alsatian";
import { LuaLibImportKind, LuaTarget } from "../../src/Transpiler";

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

    @Test("lualibRequireNoUses")
    public lualibRequireNoUses(): void {
        // Transpile
        const lua = util.transpileString(``, { luaLibImport: LuaLibImportKind.Require, luaTarget: LuaTarget.LuaJIT });

        // Assert
        Expect(lua).toBe(``);
    }

    @Test("lualibRequireAlways")
    public lualibRequireAlways(): void {
        // Transpile
        const lua = util.transpileString(``, { luaLibImport: LuaLibImportKind.Always, luaTarget: LuaTarget.LuaJIT });

        // Assert
        Expect(lua).toBe(`require("lualib_bundle")`);
    }

    @Test("Non-exported module")
    public nonExportedModule(): void {
        const lua = util.transpileString("module g { export function test() { return 3; } } return g.test();");

        const result = util.executeLua(lua);

        Expect(result).toBe(3);
    }
}
