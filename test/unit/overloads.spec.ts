import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";

export class OverloadTests {
    @Test("overload function1")
    public overloadFunction1() {
        const lua = util.transpileString(
            `function abc(def: number): string;
            function abc(def: string): string;
            function abc(def: number | string): string {
                if (typeof def == "number") {
                    return "jkl" + (def * 3);
                } else {
                    return def;
                }
            }
            return abc(3);`);

        const result = util.executeLua(lua);

        Expect(result).toBe("jkl9");
    }

    @Test("overload function2")
    public overloadFunction2() {
        const lua = util.transpileString(
            `function abc(def: number): string;
            function abc(def: string): string;
            function abc(def: number | string): string {
                if (typeof def == "number") {
                    return "jkl" + (def * 3);
                } else {
                    return def;
                }
            }
            return abc("ghj");`);

        const result = util.executeLua(lua);

        Expect(result).toBe("ghj");
    }

    @Test("overload method1")
    public overloadMethod1() {
        const lua = util.transpileString(
            `class myclass {
                static abc(def: number): string;
                static abc(def: string): string;
                static abc(def: number | string): string {
                    if (typeof def == "number") {
                        return "jkl" + (def * 3);
                    } else {
                        return def;
                    }
                }
            }
            return myclass.abc(3);`);

        const result = util.executeLua(lua);

        Expect(result).toBe("jkl9");
    }

    @Test("overload method2")
    public overloadMethod2() {
        const lua = util.transpileString(
            `class myclass {
                static abc(def: number): string;
                static abc(def: string): string;
                static abc(def: number | string): string {
                    if (typeof def == "number") {
                        return "jkl" + (def * 3);
                    } else {
                        return def;
                    }
                }
            }
            return myclass.abc("ghj");`);

        const result = util.executeLua(lua);

        Expect(result).toBe("ghj");
    }
}
