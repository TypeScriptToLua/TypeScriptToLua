import { Expect, Test, TestCase } from "alsatian";

import { LuaTarget } from "../../src/CompilerOptions";
import * as util from "../src/util";

export class SpreadElementTest {

    @TestCase([])
    @TestCase([1, 2, 3])
    @TestCase([1, "test", 3])
    @Test("Spread Element Push")
    public spreadElementPush(inp: any[]) {
        const lua = util.transpileString(`return JSONStringify([].push(...${JSON.stringify(inp)}));`);
        const result = util.executeLua(lua);
        Expect(result).toBe([].push(...inp));
    }

    @Test("Spread Element Lua 5.1")
    public spreadElement51() {
        // Cant test functional because our VM doesn't run on 5.1
        const lua = util.transpileString(`[].push(...${JSON.stringify([1, 2, 3])});`, {luaTarget: LuaTarget.Lua51});
        Expect(lua).toBe("__TS__ArrayPush({}, unpack({1,2,3}));");
    }

    @Test("Spread Element Lua 5.2")
    public spreadElement52() {
        const lua = util.transpileString(`[...[0, 1, 2]]`, {luaTarget: LuaTarget.Lua52, luaLibImport: "none"});
        Expect(lua).toBe("{table.unpack({0,1,2})};");
    }
     @Test("Spread Element Lua 5.3")
    public spreadElement53() {
        const lua = util.transpileString(`[...[0, 1, 2]]`, {luaTarget: LuaTarget.Lua53, luaLibImport: "none"});
        Expect(lua).toBe("{table.unpack({0,1,2})};");
    }
     @Test("Spread Element Lua JIT")
    public spreadElementJIT() {
        const lua = util.transpileString(`[...[0, 1, 2]]`, {luaTarget: LuaTarget.LuaJIT, luaLibImport: "none"});
        Expect(lua).toBe("{unpack({0,1,2})};");
    }
}
