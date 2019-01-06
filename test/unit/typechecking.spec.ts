import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";

export class TypeCheckingTests {
    @TestCase("0")
    @TestCase("30")
    @TestCase("30_000")
    @TestCase("30.00")
    @Test("typeof number")
    public typeofNumberTest(inp: string): void {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("number");
    }

    @TestCase("\"abc\"")
    @TestCase("`abc`")
    @Test("typeof string")
    public typeofStringTest(inp: string): void {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("string");
    }

    @TestCase("false")
    @TestCase("true")
    @Test("typeof boolean")
    public typeofBooleanTest(inp: string): void {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("boolean");
    }

    @TestCase("{}")
    @TestCase("[]")
    @Test("typeof object literal")
    public typeofObjectLiteral(inp: string): void {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("object");
    }

    @Test("typeof class instance")
    public typeofClassInstance(): void {
        const lua = util.transpileString(`class myClass {} let inst = new myClass(); return typeof inst;`);
        const result = util.executeLua(lua);

        Expect(result).toBe("object");
    }

    @Test("typeof function")
    public typeofFunction(): void {
        const lua = util.transpileString(`return typeof (() => 3);`);
        const result = util.executeLua(lua);

        Expect(result).toBe("function");
    }

    @TestCase("null")
    @TestCase("undefined")
    @Test("typeof undefined")
    public typeofUndefinedTest(inp: string): void {
        const lua = util.transpileString(`return typeof ${inp};`);
        const result = util.executeLua(lua);

        Expect(result).toBe("nil");
    }

    @Test("instanceof")
    public instanceOf(): void {
        const lua = util.transpileString("class myClass {} let inst = new myClass(); return inst instanceof myClass;");
        const result = util.executeLua(lua);

        Expect(result).toBeTruthy();
    }

    @Test("instanceof inheritance")
    public instanceOfInheritance(): void {
        const lua = util.transpileString("class myClass {}\n"
            + "class childClass extends myClass{}\n"
            + "let inst = new childClass(); return inst instanceof myClass;");
        const result = util.executeLua(lua);

        Expect(result).toBeTruthy();
    }

    @Test("instanceof inheritance false")
    public instanceOfInheritanceFalse(): void {
        const lua = util.transpileString("class myClass {}\n"
            + "class childClass extends myClass{}\n"
            + "let inst = new myClass(); return inst instanceof childClass;");
        const result = util.executeLua(lua);

        Expect(result).toBe(false);
    }

    @Test("null instanceof Object")
    public nullInstanceOf(): void {
        const lua = util.transpileString("return null instanceof Object;");
        const result = util.executeLua(lua);

        Expect(result).toBe(false);
    }

    @Test("null instanceof Class")
    public nullInstanceOfClass(): void {
        const lua = util.transpileString("class myClass {} return null instanceof myClass;");
        const result = util.executeLua(lua);

        Expect(result).toBe(false);
    }
}
