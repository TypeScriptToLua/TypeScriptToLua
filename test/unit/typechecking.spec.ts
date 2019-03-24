import * as util from "../util";
import { TranspileError } from "../../src/TranspileError";
import { TSTLErrors } from "../../src/TSTLErrors";

test.each(["0", "30", "30_000", "30.00"])("typeof number (%p)", inp => {
    const result = util.transpileAndExecute(`return typeof ${inp};`);

    expect(result).toBe("number");
});

test.each(['"abc"', "`abc`"])("typeof string (%p)", inp => {
    const result = util.transpileAndExecute(`return typeof ${inp};`);

    expect(result).toBe("string");
});

test.each(["false", "true"])("typeof boolean (%p)", inp => {
    const result = util.transpileAndExecute(`return typeof ${inp};`);

    expect(result).toBe("boolean");
});

test.each(["{}", "[]"])("typeof object literal (%p)", inp => {
    const result = util.transpileAndExecute(`return typeof ${inp};`);

    expect(result).toBe("object");
});

test("typeof class instance", () => {
    const result = util.transpileAndExecute(
        `class myClass {} let inst = new myClass(); return typeof inst;`,
    );

    expect(result).toBe("object");
});

test("typeof function", () => {
    const result = util.transpileAndExecute(`return typeof (() => 3);`);

    expect(result).toBe("function");
});

test.each(["null", "undefined"])("typeof undefined (%p)", inp => {
    const result = util.transpileAndExecute(`return typeof ${inp};`);

    expect(result).toBe("nil");
});

test("instanceof", () => {
    const result = util.transpileAndExecute(
        "class myClass {} let inst = new myClass(); return inst instanceof myClass;",
    );

    expect(result).toBeTruthy();
});

test("instanceof inheritance", () => {
    const result = util.transpileAndExecute(
        "class myClass {}\n" +
            "class childClass extends myClass{}\n" +
            "let inst = new childClass(); return inst instanceof myClass;",
    );

    expect(result).toBeTruthy();
});

test("instanceof inheritance false", () => {
    const result = util.transpileAndExecute(
        "class myClass {}\n" +
            "class childClass extends myClass{}\n" +
            "let inst = new myClass(); return inst instanceof childClass;",
    );

    expect(result).toBe(false);
});

test("null instanceof Object", () => {
    const result = util.transpileAndExecute("return (<any>null) instanceof Object;");

    expect(result).toBe(false);
});

test("null instanceof Class", () => {
    const result = util.transpileAndExecute(
        "class myClass {} return (<any>null) instanceof myClass;",
    );

    expect(result).toBe(false);
});

test.each(["extension", "metaExtension"])("instanceof extension (%p)", extensionType => {
    const code = `declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        declare const foo: any;
        const result = foo instanceof B;`;
    expect(() => util.transpileString(code)).toThrowExactError(
        TSTLErrors.InvalidInstanceOfExtension(util.nodeStub),
    );
});

test("instanceof export", () => {
    const result = util.transpileExecuteAndReturnExport(
        `export class myClass {}
        let inst = new myClass();
        export const result = inst instanceof myClass;`,
        "result",
    );

    expect(result).toBeTruthy();
});
