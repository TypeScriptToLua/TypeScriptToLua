import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
import { TranspileError } from "../../src/TranspileError";

export class TypeCheckingTests {
    @TestCase("0")
    @TestCase("30")
    @TestCase("30_000")
    @TestCase("30.00")
    @Test("typeof number")
    public typeofNumberTest(inp: string): void
    {
        const result = util.transpileAndExecute(`return typeof ${inp};`);

        Expect(result).toBe("number");
    }

    @TestCase("\"abc\"")
    @TestCase("`abc`")
    @Test("typeof string")
    public typeofStringTest(inp: string): void
    {
        const result = util.transpileAndExecute(`return typeof ${inp};`);

        Expect(result).toBe("string");
    }

    @TestCase("false")
    @TestCase("true")
    @Test("typeof boolean")
    public typeofBooleanTest(inp: string): void
    {
        const result = util.transpileAndExecute(`return typeof ${inp};`);

        Expect(result).toBe("boolean");
    }

    @TestCase("{}")
    @TestCase("[]")
    @Test("typeof object literal")
    public typeofObjectLiteral(inp: string): void
    {
        const result = util.transpileAndExecute(`return typeof ${inp};`);

        Expect(result).toBe("object");
    }

    @Test("typeof class instance")
    public typeofClassInstance(): void
    {
        const result = util.transpileAndExecute(`class myClass {} let inst = new myClass(); return typeof inst;`);

        Expect(result).toBe("object");
    }

    @Test("typeof function")
    public typeofFunction(): void
    {
        const result = util.transpileAndExecute(`return typeof (() => 3);`);

        Expect(result).toBe("function");
    }

    @TestCase("null")
    @TestCase("undefined")
    @Test("typeof undefined")
    public typeofUndefinedTest(inp: string): void
    {
        const result = util.transpileAndExecute(`return typeof ${inp};`);

        Expect(result).toBe("nil");
    }

    @Test("instanceof")
    public instanceOf(): void
    {
        const result = util.transpileAndExecute(
            "class myClass {} let inst = new myClass(); return inst instanceof myClass;"
        );

        Expect(result).toBeTruthy();
    }

    @Test("instanceof inheritance")
    public instanceOfInheritance(): void
    {
        const result = util.transpileAndExecute("class myClass {}\n"
            + "class childClass extends myClass{}\n"
            + "let inst = new childClass(); return inst instanceof myClass;");

        Expect(result).toBeTruthy();
    }

    @Test("instanceof inheritance false")
    public instanceOfInheritanceFalse(): void
    {
        const result = util.transpileAndExecute("class myClass {}\n"
            + "class childClass extends myClass{}\n"
            + "let inst = new myClass(); return inst instanceof childClass;");

        Expect(result).toBe(false);
    }

    @Test("null instanceof Object")
    public nullInstanceOf(): void
    {
        const result = util.transpileAndExecute("return (<any>null) instanceof Object;");

        Expect(result).toBe(false);
    }

    @Test("null instanceof Class")
    public nullInstanceOfClass(): void
    {
        const result = util.transpileAndExecute("class myClass {} return (<any>null) instanceof myClass;");

        Expect(result).toBe(false);
    }

    @TestCase("extension")
    @TestCase("metaExtension")
    @Test("instanceof extension")
    public instanceOfExtension(extensionType: string): void {
        const code =
            `declare class A {}
            /** @${extensionType} **/
            class B extends A {}
            declare const foo: any;
            const result = foo instanceof B;`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Cannot use instanceof on classes with decorator '@extension' or '@metaExtension'."
        );
    }

    @Test("instanceof export")
    public instanceOfExport(): void
    {
        const result = util.transpileExecuteAndReturnExport(
            `export class myClass {}
            let inst = new myClass();
            export const result = inst instanceof myClass;`,
            "result"
        );

        Expect(result).toBeTruthy();
    }
}
