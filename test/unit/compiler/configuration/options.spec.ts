import { Expect, Test, TestCase } from "alsatian";

import * as util from "../../../src/util";
import { LuaTarget, LuaLibImportKind } from "../../../../src/CompilerOptions";

export class ObjectLiteralTests
{
    @TestCase(LuaTarget.LuaJIT)
    @TestCase("jit")
    @TestCase("JiT")
    @Test("Options LuaTarget case-insensitive")
    public luaTargetCaseInsensitive(target: string): void {
        const options = {LuaTarget: target};
        const result = util.transpileString("~a", options);

        Expect(result).toBe("bit.bnot(a);");
    }

    @TestCase(LuaLibImportKind.None)
    @TestCase("none")
    @TestCase("NoNe")
    @Test("Options LuaLibImport case-insensitive")
    public luaLibImportCaseInsensitive(importKind: string): void {
        const options = {LuaLibImportKind: importKind};
        const result = util.transpileString("const a = new Map<string, string>();", options);

        Expect(result).toBe("local a = Map.new();");
    }
}
