import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

import { TranspileError } from "../../src/Errors";

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

    @TestCase(1, "ad")
    @TestCase(2, "bcd")
    @TestCase(3, "e")
    @TestCase(4, "g")
    @TestCase(5, "h")
    @TestCase(6, "i")
    @Test("re-throw")
    public reThrow(count: number, expected: any): void {
        const source =
            `declare namespace string { export function match(s: string, p: string): string | null; }
            let i = ${count};
            function foo(s: string) { if (--i <= 0) { throw s; } }
            try {
                try {
                    foo("a");
                    try {
                        foo("b");
                    } catch (e) {
                        foo(e + "c");
                    }
                } catch (e) {
                    foo(e + "d");
                } finally {
                    foo("e");
                }
                try {
                    foo("f");
                } catch {
                    foo("g");
                } finally {
                    foo("h");
                }
            } catch (e) {
                return string.match(e, "[a-h]+$");
            } finally {
                return "i";
            }`;
        const result = util.transpileAndExecute(source);
        Expect(result).toBe(expected);
    }
}
