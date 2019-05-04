import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

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

    expect(result).toBe(true);
});

test("instanceof inheritance", () => {
    const result = util.transpileAndExecute(`
        class myClass {}
        class childClass extends myClass{}
        let inst = new childClass(); return inst instanceof myClass;
    `);

    expect(result).toBe(true);
});

test("instanceof inheritance false", () => {
    const result = util.transpileAndExecute(`
        class myClass {}
        class childClass extends myClass{}
        let inst = new myClass(); return inst instanceof childClass;
    `);

    expect(result).toBe(false);
});

test("{} instanceof Object", () => {
    const result = util.transpileAndExecute("return {} instanceof Object;");

    expect(result).toBe(true);
});

test("function instanceof Object", () => {
    const result = util.transpileAndExecute("return (() => {}) instanceof Object;");

    expect(result).toBe(true);
});

test("null instanceof Object", () => {
    const result = util.transpileAndExecute("return (null as any) instanceof Object;");

    expect(result).toBe(false);
});

test("instanceof undefined", () => {
    expect(() => {
        util.transpileAndExecute("return {} instanceof (undefined as any);");
    }).toThrow("Right-hand side of 'instanceof' is not an object");
});

test("null instanceof Class", () => {
    const result = util.transpileAndExecute(
        "class myClass {} return (null as any) instanceof myClass;",
    );

    expect(result).toBe(false);
});

test.each(["extension", "metaExtension"])("instanceof extension (%p)", extensionType => {
    const code = `
        declare class A {}
        /** @${extensionType} **/
        class B extends A {}
        declare const foo: any;
        const result = foo instanceof B;
    `;
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

    expect(result).toBe(true);
});

test("instanceof Symbol.hasInstance", () => {
    const result = util.transpileAndExecute(`
        class myClass {
            static [Symbol.hasInstance]() {
                return false;
            }
        }

        const inst = new myClass();
        const isInstanceOld = inst instanceof myClass;
        myClass[Symbol.hasInstance] = () => true;
        const isInstanceNew = inst instanceof myClass;
        return isInstanceOld !== isInstanceNew;
    `);

    expect(result).toBe(true);
});
