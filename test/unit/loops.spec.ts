import { Expect, Test, TestCase, FocusTest } from "alsatian";
import * as util from "../src/util"

const deepEqual = require('deep-equal')

export class LuaLoopTests {

    @Test("continue")
    public continue(inp: number[], expected: number[]) {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `while (i < arrTest.length) {
                    continue;
                }`
            );
        }).toThrowError(Error, "Continue is not supported in Lua")
    }


    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("while")
    public while(inp: number[], expected: number[]) {
        // Transpile
        let lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            let i = 0;
            while (i < arrTest.length) {
                arrTest[i] = arrTest[i] + 1;
                i++;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("for")
    public for(inp: number[], expected: number[]) {
        // Transpile
        let lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; i < arrTest.length; ++i) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("forMirror")
    public forMirror(inp: number[], expected: number[]) {
        // Transpile
        let lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; arrTest.length > i; i++) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [0, 1, 2, 3])
    @Test("forBreak")
    public forBreak(inp: number[], expected: number[]) {
        // Transpile
        let lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; i < arrTest.length; ++i) {
                break;
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; i < arrTest.length; i++")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; i <= arrTest.length - 1; i++")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; arrTest.length > i; i++")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; arrTest.length - 1 >= i; i++")
    @TestCase([0, 1, 2, 3], [1, 1, 3, 3], "let i = 0; i < arrTest.length; i += 2")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = arrTest.length - 1; i <= 0; i--")
    @TestCase([0, 1, 2, 3], [0, 2, 2, 4], "let i = arrTest.length - 1; i <= 0; i -= 2")
    @TestCase([0, 1, 2, 3], [0, 2, 2, 4], "let i = arrTest.length - 1; i >= 0; i -= 2")
    @TestCase([0, 1, 2, 3], [0, 2, 2, 4], "let i = arrTest.length - 1; i > 0; i -= 2")
    @Test("forheader")
    public forheader(inp: number[], expected: number[], header: string) {
        // Transpile
        let lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (${header}) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @Test("forstepThrow")
    public forstepThrow(inp: number[], expected: number[], header: string) {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `for (let i = 0; i < 30; i = i + 10) {
                }`
            );

            // Execute
            let result = util.executeLua(lua);
        }).toThrowError(Error, "Unsupported for-loop increment step: BinaryExpression")
    }

    @TestCase("let i = 0; i + 3; i++")
    @TestCase("let i = 0; 3 + i; i++")
    @TestCase("let i = 0; i - 3; i++")
    @TestCase("let i = 0; i * 3; i++")
    @TestCase("let i = 0; i / 3; i++")
    @TestCase("let i = 0; i &= 3; i++")
    @TestCase("let i = 0; i < 3; !i")
    @TestCase("let i = 0; i < 3; i as string")
    @Test("forconditionThrow")
    public forconditionThrow(header: string) {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `for (${header}) {
                }`
            );

            // Execute
            let result = util.executeLua(lua);
        }).toThrow();
    }

    @TestCase({ ['test1']: 0, ['test2']: 1, ['test3']: 2 }, { ['test1']: 1, ['test2']: 2, ['test3']: 3 })
    @Test("forin[Object]")
    public forinObject(inp: any, expected: any) {
        // Transpile
        let lua = util.transpileString(
            `let objTest = ${JSON.stringify(inp)};
            for (let key in objTest) {
                objTest[key] = objTest[key] + 1;
            }
            return JSONStringify(objTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(deepEqual(JSON.parse(result), expected)).toBe(true);
    }

    @TestCase([1, 2, 3])
    @Test("forin[Array]")
    public forinArray(inp: number[]) {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `let arrTest = ${JSON.stringify(inp)};
                for (let key in arrTest) {
                    arrTest[key]++;
                }`
            );
        }).toThrowError(Error, "Iterating over arrays with 'for in' is not allowed.");
    }

    @TestCase([0, 1, 2], [1, 2, 3])
    @Test("forof")
    public forof(inp: any, expected: any) {
        // Transpile
        let lua = util.transpileString(
            `let objTest = ${JSON.stringify(inp)};
            let arrResultTest = [];
            for (let value of objTest) {
                arrResultTest.push(value + 1)
            }
            return JSONStringify(arrResultTest);`
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

}
