import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class LuaCurryTests {

    @Test("curryingAdd")
    @TestCase(2, 3)
    @TestCase(5, 4)
    public curryingAdd(x: number, y: number): void {
        // Transpile
        const lua = util.transpileString(
            `let add = (x: number) => (y: number) => x + y;
            return add(${x})(${y})`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(x + y);
    }
}
