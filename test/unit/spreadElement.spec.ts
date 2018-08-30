import { Expect, Test, TestCase } from "alsatian";

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
}
