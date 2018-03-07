import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

export class LuaCurryTests {

    @Test("currying")
    public currying() {
        // Transpile
        let lua = util.transpileString(
            `(x: number) => (y: number) => x + y;`
            , util.dummyTypes.Number
        );
        // Assert
        Expect(lua).toBe(`function(x) return function(y) return x+y end end`);
    }

    @Test("curryingAdd")
    @TestCase(2, 3)
    @TestCase(5, 4)
    public curryingAdd(x: number, y: number) {
        // Transpile
        let lua = util.transpileString(
            `let add = (x: number) => (y: number) => x + y;
            return add(${x})(${y})`
            , util.dummyTypes.Number
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(x + y);
    }
}
