import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class LuaCurryTests {

    @Test("curryingAdd")
    @TestCase(2, 3)
    @TestCase(5, 4)
    public curryingAdd(x: number, y: number): void
    {
        const result = util.transpileAndExecute(
            `let add = (x: number) => (y: number) => x + y;
            return add(${x})(${y})`
        );

        // Assert
        Expect(result).toBe(x + y);
    }
}
