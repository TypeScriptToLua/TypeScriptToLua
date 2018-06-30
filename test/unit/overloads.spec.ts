import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";

export class OverloadTests {

    @Test("overload1")
    public overload1() {
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

    @Test("overload2")
    public overload2() {
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
}
