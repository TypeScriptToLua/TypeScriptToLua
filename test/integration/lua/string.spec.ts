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

    @TestCase(["", ""], "")
    @TestCase(["hello", "test"], "hellotest")
    @TestCase(["hello", "test", "bye"], "hellotestbye")
    @TestCase(["hello", 42], "hello42")
    @TestCase([42, "hello"], "42hello")
    @Test("string.concat[+]")
    public concat(inp: any[], expected: string) {
        // Transpile
        let lua = util.transpileString(
            `return '${inp.join("' + '")}'`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase("hello test", new RegExp("123", "g"), "")
    @IgnoreTest()
    @Test("string.replace[Regex]")
    public replaceRegex(inp: string, searchValue: string, replaceValue: string) {
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
    public indexOf(inp: string, searchValue: string) {
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
    public substring(inp: string, start: number, end?: number) {
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

    @TestCase("", 0)
    @TestCase("h", 1)
    @TestCase("hello", 5)
    @Test("string.length")
    public length(inp: string, expected: number) {
        // Transpile
        let lua = util.transpileString(
            `return "${inp}".length`,
            util.dummyTypes.String
        );

        // Execute
        let result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.length);
    }
}
