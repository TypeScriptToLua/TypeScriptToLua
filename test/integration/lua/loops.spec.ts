import { Expect, Test, TestCase } from "alsatian";
import * as util from "../../src/util"

const deepEqual = require('deep-equal')

export class LuaLoopTests {

    @TestCase([0, 1, 2, 3], [1, 2, 3, 4])
    @Test("for")
    public for<T>(inp: T[], expected: T[]) {
        // Transpile
        let lua = util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; i < arrTest.length; ++i) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
            , util.dummyTypes.Array
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }

    @TestCase({ ['test1']: 0, ['test2']: 1, ['test3']: 2 }, { ['test1']: 1, ['test2']: 2, ['test3']: 3 })
    @Test("forin[Object]")
    public forinObject<T>(inp: any, expected: any) {
        // Transpile
        let lua = util.transpileString(
            `let objTest = ${JSON.stringify(inp)};
            for (let key in objTest) {
                objTest[key] = objTest[key] + 1;
            }
            return JSONStringify(objTest);`
            , util.dummyTypes.Object
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(deepEqual(JSON.parse(result), expected)).toBe(true);
    }

    @TestCase([1,2,3])
    @Test("forin[Array]")
    public forinArray<T>(inp: T[]) {
        // Transpile & Assert
        Expect(() => {
            let lua = util.transpileString(
                `let arrTest = ${JSON.stringify(inp)};
                for (let key in arrTest) {
                    arrTest[key]++;
                }`
                , util.dummyTypes.Array
            );
        }).toThrowError(Error, "Iterating over arrays with 'for in' is not allowed.");
    }

    @TestCase([0,1,2], [1,2,3])
    @Test("forof")
    public forof<T>(inp: any, expected: any) {
        // Transpile
        let lua = util.transpileString(
            `let objTest = ${JSON.stringify(inp)};
            let arrResultTest = {};
            for (let value of objTest) {
                arrResultTest.push(value + 1)
            }
            return JSONStringify(arrResultTest);`
            , util.dummyTypes.Array
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(expected));
    }
}
