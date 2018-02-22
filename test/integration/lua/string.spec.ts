import { Expect, Test, TestCase, IgnoreTest } from "alsatian";
import * as util from "../../src/util"

export class StringTests {

    @TestCase([])
    @TestCase([65])
    @TestCase([65, 66])
    @TestCase([65, 66, 67])
    @Test("String.fromCharCode")
    public stringFromCharcode(inp: number[], expected: string) {
        // Transpile
        let lua = util.transpileString(
            `return String.fromCharCode(${inp.toString()})`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(String.fromCharCode(...inp));
    }

    @TestCase("hello test", "", "")
    @TestCase("hello test", " ", "")
    @TestCase("hello test", "hello", "")
    @TestCase("hello test", "test", "")
    @TestCase("hello test", "test", "world")
    @Test("string.replace")
    public replace<T>(inp: string, searchValue: string, replaceValue: string) {
        // Transpile
        let lua = util.transpileString(
            `return "${inp}".replace("${searchValue}", "${replaceValue}")`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.replace(searchValue, replaceValue));
    }

    @TestCase("hello test", new RegExp("123", "g"), "")
    @IgnoreTest()
    @Test("string.replace[Regex]")
    public replaceRegex<T>(inp: string, searchValue: string, replaceValue: string) {
        // Transpile
        let lua = util.transpileString(
            `return "${inp}".replace("${searchValue}", "${replaceValue}")`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.replace(searchValue, replaceValue));
    }

    @TestCase("hello test", "")
    @TestCase("hello test", "t")
    @TestCase("hello test", "h")
    @Test("string.indexOf")
    public indexOf<T>(inp: string, searchValue: string) {
        // Transpile
        let lua = util.transpileString(
            `return "${inp}".indexOf("${searchValue}")`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.indexOf(searchValue));
    }

    @TestCase("hello test", 0)
    @TestCase("hello test", 1)
    @TestCase("hello test", 1, 2)
    @TestCase("hello test", 1, 5)
    @Test("string.substring")
    public substring<T>(inp: string, start: number, end?: number) {
        // Transpile
        let paramStr = end ? `${start}, ${end}` : `${start}`;
        let lua = util.transpileString(
            `return "${inp}".substring(${paramStr})`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.substring(start, end));
    }
}
