import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/TranspileError";

export class LuaErrorTests {

    @Test("throwString")
    public trowString(): void {
        // Transpile
        const lua = util.transpileString(
            `throw "Some Error"`
        );
        // Assert
        Expect(lua).toBe(`error("Some Error");`);
    }

    @Test("throwError")
    public throwError(): void {
        // Transpile & Asser
        Expect(() => {
            const lua = util.transpileString(
                `throw Error("Some Error")`
            );
        }).toThrowError(TranspileError, "Invalid throw expression, only strings can be thrown.");
    }

    @TestCase(0, "A")
    @TestCase(1, "B")
    @TestCase(2, "C")
    @Test("re-throw")
    public reThrow(i: number, expected: any): void {
        const source =
            `const i: number = ${i};
            function foo() {
                try {
                    try {
                        if (i === 0) { throw "z"; }
                    } catch (e) {
                        throw "a";
                    } finally {
                        if (i === 1) { throw "b"; }
                    }
                } catch (e) {
                    throw (e as string).toUpperCase();
                } finally {
                    throw "C";
                }
            }
            let result: string = "x";
            try {
                foo();
            } catch (e) {
                result = (e as string)[(e as string).length - 1];
            }
            return result;`;
        const result = util.transpileAndExecute(source);
        Expect(result).toBe(expected);
    }

    @Test("re-throw (no catch var)")
    public reThrowWithoutCatchVar(): void {
        const source =
            `let result = "x";
            try {
                try {
                    throw "y";
                } catch {
                    throw "z";
                }
            } catch (e) {
                result = (e as string)[(e as string).length - 1];
            }
            return result;`;
        const result = util.transpileAndExecute(source);
        Expect(result).toBe("z");
    }
}
