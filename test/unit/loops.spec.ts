import { Expect, Test, TestCase } from "alsatian";
import { LuaTarget } from "../../src/Transpiler";
import * as util from "../src/util";

const deepEqual = require("deep-equal");

export class LuaLoopTests {

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("while")
    public while(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            let i = 0;
            while (i < arrTest.length) {
                arrTest[i] = arrTest[i] + 1;
                i++;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3, 4], [0, 1, 2, 1, 4])
    @Test("while with continue")
    public whileWithContinue(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            let i = 0;
            while (i < arrTest.length) {
                if (i % 2 == 0) {
                    i++;
                    continue;
                }
                let j = 2;
                while (j > 0) {
                    if (j == 2) {
                        j--
                        continue;
                    }
                    arrTest[i] = j;
                    j--;
                }

                i++;
            }
            return JSONStringify(arrTest);`
        );

        // Executre
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3, 4], [0, 1, 2, 1, 4])
    @Test("dowhile with continue")
    public dowhileWithContinue(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            let i = 0;
            do {
                if (i % 2 == 0) {
                    i++;
                    continue;
                }
                let j = 2;
                do {
                    if (j == 2) {
                        j--
                        continue;
                    }
                    arrTest[i] = j;
                    j--;
                } while (j > 0)

                i++;
            } while (i < arrTest.length)
            return JSONStringify(arrTest);`
        );

        // Executre
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("for")
    public for(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; i < arrTest.length; ++i) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3, 4], [0, 0, 2, 0, 4])
    @Test("for with continue")
    public forWithContinue(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; i < arrTest.length; i++) {
                if (i % 2 == 0) {
                    continue;
                }

                for (let j = 0; j < 2; j++) {
                    if (j == 1) {
                        continue;
                    }
                    arrTest[i] = j;
                }
            }
            return JSONStringify(arrTest);
            `
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("forMirror")
    public forMirror(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; arrTest.length > i; i++) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [0, 1, 2, 3])
    @Test("forBreak")
    public forBreak(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; i < arrTest.length; ++i) {
                break;
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; i < arrTest.length; i++")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; i <= arrTest.length - 1; i++")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; arrTest.length > i; i++")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4], "let i = 0; arrTest.length - 1 >= i; i++")
    @TestCase([0, 1, 2, 3], [1, 1, 3, 3], "let i = 0; i < arrTest.length; i += 2")
    @TestCase([0, 1, 2, 3], [1, 2, 3, 4 ], "let i = arrTest.length - 1; i >= 0; i--")
    @TestCase([0, 1, 2, 3], [0, 2, 2, 4], "let i = arrTest.length - 1; i >= 0; i -= 2")
    @TestCase([0, 1, 2, 3], [0, 2, 2, 4], "let i = arrTest.length - 1; i > 0; i -= 2")
    @Test("forheader")
    public forheader(inp: number[], expected: number[], header: string): void {
        // Transpile
        const lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (${header}) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase({ ["test1"]: 0, ["test2"]: 1, ["test3"]: 2 }, { ["test1"]: 1, ["test2"]: 2, ["test3"]: 3 })
    @Test("forin[Object]")
    public forinObject(inp: any, expected: any): void {
        // Transpile
        const lua = util.transpileString(
            `let objTest = ${JSON.stringify(inp)};
            for (let key in objTest) {
                objTest[key] = objTest[key] + 1;
            }
            return JSONStringify(objTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(deepEqual(JSON.parse(result), expected)).toBe(true);
    }

    @TestCase([1, 2, 3])
    @Test("forin[Array]")
    public forinArray(inp: number[]): void {
        // Transpile & Assert
        Expect(() =>
            util.transpileString(
                `let arrTest = ${JSON.stringify(inp)};
                for (let key in arrTest) {
                    arrTest[key]++;
                }`
            )
        ).toThrowError(Error, "Iterating over arrays with 'for in' is not allowed.");
    }

    @TestCase({a: 0, b: 1, c: 2, d: 3, e: 4}, {a: 0, b: 0, c: 2, d: 0, e: 4})
    @Test("forin with continue")
    public forinWithContinue(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let obj = ${JSON.stringify(inp)};
            for (let i in obj) {
                if (obj[i] % 2 == 0) {
                    continue;
                }

                obj[i] = 0;
            }
            return JSONStringify(obj);
            `
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2], [1, 2, 3])
    @Test("forof")
    public forof(inp: any, expected: any): void {
        // Transpile
        const lua = util.transpileString(
            `let objTest = ${JSON.stringify(inp)};
            let arrResultTest = [];
            for (let value of objTest) {
                arrResultTest.push(value + 1)
            }
            return JSONStringify(arrResultTest);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase([0, 1, 2, 3, 4], [0, 0, 2, 0, 4])
    @Test("forof with continue")
    public forofWithContinue(inp: number[], expected: number[]): void {
        // Transpile
        const lua = util.transpileString(
            `let testArr = ${JSON.stringify(inp)};
            let a = 0;
            for (let i of testArr) {
                if (i % 2 == 0) {
                    a++;
                    continue;
                }

                for (let j of [0, 1]) {
                    if (j == 1) {
                        continue;
                    }
                    testArr[a] = j;
                }
                a++;
            }
            return JSONStringify(testArr);`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase("while (a < b) { i++; }")
    @TestCase("do { i++; } while (a < b)")
    @TestCase("for (let i = 0; i < 3; i++) {}")
    @TestCase("for (let a in b) {}")
    @TestCase("for (let a of b) {}")
    @Test("loop versions")
    public whileVersions(loop: string): void {
        // Transpile
        const lua51 = util.transpileString(loop, { luaTarget: LuaTarget.Lua51 });
        const lua52 = util.transpileString(loop, { luaTarget: LuaTarget.Lua52 });
        const lua53 = util.transpileString(loop, { luaTarget: LuaTarget.Lua53 });
        const luajit = util.transpileString(loop, { luaTarget: LuaTarget.LuaJIT });

        // Assert
        Expect(lua51.indexOf("::__continue0::") !== -1).toBe(false); // No labels in 5.1
        Expect(lua52.indexOf("::__continue0::") !== -1).toBe(true); // Labels from 5.2 onwards
        Expect(lua53.indexOf("::__continue0::") !== -1).toBe(true);
        Expect(luajit.indexOf("::__continue0::") !== -1).toBe(true);
    }

    @Test("for dead code after return")
    public forDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `for (let i = 0; i < 10; i++) { return 3; const b = 8; }`);

        Expect(result).toBe(3);
    }

    @Test("for..in dead code after return")
    public forInDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `for (let a in {"a": 5, "b": 8}) { return 3; const b = 8; }`);

        Expect(result).toBe(3);
    }

    @Test("for..of dead code after return")
    public forOfDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `for (let a of [1,2,4]) { return 3; const b = 8; }`);

        Expect(result).toBe(3);
    }

    @Test("while dead code after return")
    public whileDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `while (true) { return 3; const b = 8; }`);

        Expect(result).toBe(3);
    }
}
