import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util"

export class LuaLibArrayTests {

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("forEach")
    public forEach(inp: number[], expected: number[]) {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            arrTest.forEach((elem, index) => {
                arrTest[index] = arrTest[index] + 1;
            })
            return JSONStringify(arrTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([], "x => x")
    @TestCase([0, 1, 2, 3], "x => x")
    @TestCase([0, 1, 2, 3], "x => x*2")
    @TestCase([1, 2, 3, 4], "x => -x")
    @TestCase([0, 1, 2, 3], "x => x+2")
    @TestCase([0, 1, 2, 3], "x => x%2 == 0 ? x + 1 : x - 1")
    @Test("array.map")
    public map<T>(inp: T[], func: string) {
        // Transpile
        const lua = util.transpileString(`return JSONStringify([${inp.toString()}].map(${func}))`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(inp.map(eval(func))));
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
        const lua = util.transpileString(`return JSONStringify([${inp.toString()}].filter(${func}))`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(inp.filter(eval(func))));
    }

    @TestCase([], "x => x > 1")
    @TestCase([0, 1, 2, 3], "x => x > 1")
    @TestCase([false, true, false], "x => x")
    @TestCase([true, true, true], "x => x")
    @Test("array.every")
    public every<T>(inp: T[], func: string) {
        // Transpile
        const lua = util.transpileString(`return JSONStringify([${inp.toString()}].every(${func})))`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(inp.every(eval(func))));
    }

    @TestCase([], "x => x > 1")
    @TestCase([0, 1, 2, 3], "x => x > 1")
    @TestCase([false, true, false], "x => x")
    @TestCase([true, true, true], "x => x")
    @Test("array.some")
    public some<T>(inp: T[], func: string) {
        // Transpile
        const lua = util.transpileString(`return JSONStringify([${inp.toString()}].some(${func})))`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(inp.some(eval(func))));
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
        const lua = util.transpileString(`return JSONStringify([${inp.toString()}].slice(${start}, ${end}))`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(inp.slice(start, end)));
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
        const lua = util.transpileString(
            `let spliceTestTable = [${inp.toString()}];
            spliceTestTable.splice(${start}, ${deleteCount}, ${newElements});
            return JSONStringify(spliceTestTable);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        inp.splice(start, deleteCount, ...newElements)
        Expect(result).toBe(JSON.stringify(inp));
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
        const lua = util.transpileString(`return JSONStringify([${inp.toString()}].splice(${start}, ${deleteCount}, ${newElements}))`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        if (deleteCount) {
            Expect(result).toBe(JSON.stringify(inp.splice(start, deleteCount, ...newElements)));
        } else {
            Expect(result).toBe(JSON.stringify(inp.splice(start)));
        }
    }

    @TestCase([], "")
    @TestCase(["test1"], "test1")
    @TestCase(["test1", "test2"], "test1,test2")
    @TestCase(["test1", "test2"], "test1;test2", ";")
    @TestCase(["test1", "test2"], "test1test2", "")
    @Test("array.join")
    public join<T>(inp: T[], expected: string, seperator?: string) {
        let seperatorLua;
        if (seperator === "") {
            seperatorLua = "\"\"";
        } else if (seperator) {
            seperatorLua = "\"" + seperator + "\"";
        } else {
            seperatorLua = "";
        }
        // Transpile
        const lua = util.transpileString(
            `let joinTestTable = ${JSON.stringify(inp)};
            return joinTestTable.join(${seperatorLua});`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        const joinedInp = inp.join(seperator);
        Expect(result).toBe(joinedInp);
    }

    @TestCase([], "test1")
    @TestCase(["test1"], "test1")
    @TestCase(["test1", "test2"], "test2")
    @Test("array.indexOf")
    public indexOf(inp: string[], element: string) {
        // Transpile
        const lua = util.transpileString(
            `return ${JSON.stringify(inp)}.indexOf("${element}"))`

        );

        // Execute
        const result = util.executeLua(lua, util.LuaReturnType.Number);

        // Assert
        // Acount for lua indexing (-1)
        Expect(result).toBe(inp.indexOf(element));
    }

    @TestCase([1, 2, 3], 3)
    @TestCase([1, 2, 3, 4, 5], 3)
    @Test("array.destructuring.simple")
    public arrayDestructuringSimple(inp: number[], expected: number) {
        // Transpile
        const lua = util.transpileString(
            `let [x, y, z] = ${JSON.stringify(inp)}
            return z;
            `);

        // Execute
        const result = util.executeLua(lua, util.LuaReturnType.Number);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase([1])
    @TestCase([1, 2, 3])
    @Test("array.push")
    public arrayPush(inp: number[]) {
        // Transpile
        const lua = util.transpileString(
            `let testArray = [0];
            testArray.push(${inp.join(', ')});
            return JSONStringify(testArray);
            `
            );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify([0].concat(inp)));
    }
}
