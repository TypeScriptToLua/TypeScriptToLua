import { Expect, Test, TestCase } from "alsatian";

import { LuaTarget } from "../../src/Transpiler";
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
}
