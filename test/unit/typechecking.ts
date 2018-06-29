import { Expect, Test, TestCase, FocusTest } from "alsatian";

import * as util from "../src/util";

export class OverloadTests {

    @TestCase("0")
    @TestCase("30")
    @TestCase("30_000")
    @TestCase("30.00")
    @Test("typeof number")
    @FocusTest
    public typeofNumberTest(inp: string) {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("number");
    }

    @TestCase("\"abc\"")
    @TestCase("`abc`")
    @Test("typeof string")
    public typeofStringTest(inp: string) {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("string");
    }

    @TestCase("false")
    @TestCase("true")
    @Test("typeof boolean")
    public typeofBooleanTest(inp: string) {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("boolean");
    }

    @Test("{}")
    @Test("[]")
    @Test("typeof object literal")
    public typeofObjectLiteral(inp: string) {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("table");
    }

    @Test("typeof class instance")
    public typeofClassInstance() {
        const lua = util.transpileString(`class myClass {} let inst = new myClass(); return typeof inst;`);
        const result = util.executeLua(lua);

        Expect(result).toBe("table");
    }

    @Test("null")
    @Test("undefined")
    @Test("typeof undefined")
    public typeofUndefinedTest(inp: string) {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("nil");
    }
}
