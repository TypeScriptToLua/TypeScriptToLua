import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

export class LuaLibArrayTests {

    @TestCase([], "x => x")
    @TestCase([0, 1, 2, 3], "x => x")
    @TestCase([0, 1, 2, 3], "x => x*2")
    @TestCase([1, 2, 3, 4], "x => -x")
    @TestCase([0, 1, 2, 3], "x => x+2")
    @TestCase([0, 1, 2, 3], "x => x%2 == 0 ? x + 1 : x - 1")
    @Test("array.map")
    public map<T>(inp: T[], func: string) {
        // Transpile
        let lua = util.transpileString(`return ArrayToString([${inp.toString()}].map(${func}))`, util.dummyTypes.Array);

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.map(eval(func)).toString());
    }

    @TestCase([], "x => x > 1")
    @TestCase([0, 1, 2, 3], "x => x > 1")
    @TestCase([0, 1, 2, 3], "x => x < 3")
    @TestCase([0, 1, 2, 3], "x => x < 0")
    @TestCase([0, -1, -2, -3], "x => x < 0")
    @TestCase([0, 1, 2, 3], "() => true")
    @TestCase([0, 1, 2, 3], "() => false")
    @Test("array.filter")
    public filter<T>(inp: T[], func: string) {
        // Transpile
        let lua = util.transpileString(`return ArrayToString([${inp.toString()}].filter(${func}))`, util.dummyTypes.Array);

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.filter(eval(func)).toString());
    }

    @TestCase([], "x => x > 1")
    @TestCase([0, 1, 2, 3], "x => x > 1")
    @TestCase([false, true, false], "x => x")
    @TestCase([true, true, true], "x => x")
    @Test("array.every")
    public every<T>(inp: T[], func: string) {
        // Transpile
        let lua = util.transpileString(`return [${inp.toString()}].every(${func}))`, util.dummyTypes.Array);

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result.toString()).toBe(inp.every(eval(func)).toString());
    }

    @TestCase([], "x => x > 1")
    @TestCase([0, 1, 2, 3], "x => x > 1")
    @TestCase([false, true, false], "x => x")
    @TestCase([true, true, true], "x => x")
    @Test("array.some")
    public some<T>(inp: T[], func: string) {
        // Transpile
        let lua = util.transpileString(`return [${inp.toString()}].some(${func}))`, util.dummyTypes.Array);

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result.toString()).toBe(inp.some(eval(func)).toString());
    }

    @TestCase([], 1, 2)
    @TestCase([0, 1, 2, 3], 1, 2)
    @TestCase([0, 1, 2, 3], 1, 1)
    @TestCase([0, 1, 2, 3], 1, -1)
    @TestCase([0, 1, 2, 3], -3, -1)
    @TestCase([0, 1, 2, 3, 4, 5], 1, 3)
    @TestCase([0, 1, 2, 3, 4, 5], 3)
    @Test("array.slice")
    public slice<T>(inp: T[], start: number, end?: number) {
        // Transpile
        let lua = util.transpileString(`return ArrayToString([${inp.toString()}].slice(${start}, ${end}))`, util.dummyTypes.Array);

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.slice(start, end).toString());
    }

    @TestCase([], 0, 0, 9, 10, 11)
    @TestCase([0, 1, 2, 3], 1, 0, 9, 10, 11)
    @TestCase([0, 1, 2, 3], 2, 2, 9, 10, 11)
    @TestCase([0, 1, 2, 3], 4, 1, 8, 9)
    @TestCase([0, 1, 2, 3], 4, 0, 8, 9)
    @TestCase([0, 1, 2, 3, 4, 5], 5, 9, 10, 11)
    @TestCase([0, 1, 2, 3, 4, 5], 3, 2, 3, 4, 5)
    @Test("array.splice[Insert]")
    public spliceInsert<T>(inp: T[], start: number, deleteCount: number, ...newElements: any[]) {
        // Transpile
        let lua = util.transpileString(
            `let spliceTestTable = [${inp.toString()}];
            spliceTestTable.splice(${start}, ${deleteCount}, ${newElements});
            return ArrayToString(spliceTestTable);`,
            util.dummyTypes.Array
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        inp.splice(start, deleteCount, ...newElements)
        Expect(result).toBe(inp.toString());
    }

    @TestCase([], 1, 1)
    @TestCase([0, 1, 2, 3], 1, 1)
    @TestCase([0, 1, 2, 3], 10, 1)
    @TestCase([0, 1, 2, 3], 4)
    @TestCase([0, 1, 2, 3, 4, 5], 3)
    @TestCase([0, 1, 2, 3, 4, 5], 2, 2)
    @TestCase([0, 1, 2, 3, 4, 5, 6, 7, 8], 5, 9, 10, 11)
    @Test("array.splice[Remove]")
    public spliceRemove<T>(inp: T[], start: number, deleteCount?: number, ...newElements: any[]) {
        // Transpile
        let lua = util.transpileString(`return ArrayToString([${inp.toString()}].splice(${start}, ${deleteCount}, ${newElements}))`, util.dummyTypes.Array);

        // Execute
        let result = util.executeLua(lua);

        // Assert
        if (deleteCount) {
            Expect(result).toBe(inp.splice(start, deleteCount, ...newElements).toString());
        } else {
            Expect(result).toBe(inp.splice(start).toString());
        }
    }
}
