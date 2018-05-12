import { Expect, Test, TestCase } from "alsatian";
import * as util from "../src/util";

export class StringTests {

    @Test("Unsuported string function")
    public stringUnsuportedFunction() {
        // Assert
        Expect(() => {
            util.transpileString(
                `return "test".testThisIsNoMember()`
            );
        }).toThrowError(Error, "Unsupported string function: testThisIsNoMember");
    }

    @TestCase([])
    @TestCase([65])
    @TestCase([65, 66])
    @TestCase([65, 66, 67])
    @Test("String.fromCharCode")
    public stringFromCharcode(inp: number[], expected: string) {
        // Transpile
        const lua = util.transpileString(
            `return String.fromCharCode(${inp.toString()})`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(String.fromCharCode(...inp));
    }

    @TestCase(12, 23, 43)
    @TestCase("test", "hello", "bye")
    @TestCase("test", 42, "bye")
    @TestCase("test", 42, 12)
    @Test("Template Strings")
    public templateStrings(a: any, b: any, c: any) {
        // Transpile
        const a1 = typeof(a) === "string" ? "'" + a + "'" : a;
        const b1 = typeof(b) === "string" ? "'" + b + "'" : b;
        const c1 = typeof(c) === "string" ? "'" + c + "'" : c;

        const lua = util.transpileString(
            "let a = " + a1 + "; let b = " + b1 + "; let c = " + c1 + "; return `${a} ${b} test ${c}`;"
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(`${a} ${b} test ${c}`);
    }

    @TestCase("hello test", "", "")
    @TestCase("hello test", " ", "")
    @TestCase("hello test", "hello", "")
    @TestCase("hello test", "test", "")
    @TestCase("hello test", "test", "world")
    @Test("string.replace")
    public replace<T>(inp: string, searchValue: string, replaceValue: string) {
        // Transpile
        const lua = util.transpileString(
            `return "${inp}".replace("${searchValue}", "${replaceValue}");`
        );

        // Execute
        const result = util.executeLua(lua);

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
        const concatStr = inp.map(elem => typeof(elem) === "string" ? `"${elem}"` : elem).join(" + ");

        // Transpile
        const lua = util.transpileString(
            `return ${concatStr}`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase("hello test", "")
    @TestCase("hello test", "t")
    @TestCase("hello test", "h")
    @TestCase("hello test", "invalid")
    @Test("string.indexOf")
    public indexOf(inp: string, searchValue: string) {
        // Transpile
        const lua = util.transpileString(`return "${inp}".indexOf("${searchValue}")`);

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.indexOf(searchValue));
    }

    @TestCase("hello test", "t", 5)
    @TestCase("hello test", "t", 6)
    @TestCase("hello test", "t", 7)
    @TestCase("hello test", "h", 4)
    @Test("string.indexOf with offset")
    public indexOfOffset(inp: string, searchValue: string, offset: number) {
        // Transpile
        const lua = util.transpileString(
            `return "${inp}".indexOf("${searchValue}", ${offset})`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.indexOf(searchValue, offset));
    }

    @TestCase("hello test", 0)
    @TestCase("hello test", 1)
    @TestCase("hello test", 1, 2)
    @TestCase("hello test", 1, 5)
    @Test("string.substring")
    public substring(inp: string, start: number, end?: number) {
        // Transpile
        const paramStr = end ? `${start}, ${end}` : `${start}`;
        const lua = util.transpileString(
            `return "${inp}".substring(${paramStr})`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.substring(start, end));
    }

    @TestCase("", 0)
    @TestCase("h", 1)
    @TestCase("hello", 5)
    @Test("string.length")
    public length(inp: string, expected: number) {
        // Transpile
        const lua = util.transpileString(
            `return "${inp}".length`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.length);
    }

    @TestCase("hello TEST")
    @Test("string.toLowerCase")
    public toLowerCase(inp: string) {
        // Transpile
        const lua = util.transpileString(
            `return "${inp}".toLowerCase()`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.toLowerCase());
    }

    @TestCase("hello test")
    @Test("string.toUpperCase")
    public toUpperCase(inp: string) {
        // Transpile
        const lua = util.transpileString(
            `return "${inp}".toUpperCase()`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.toUpperCase());
    }

    @TestCase("hello test", "")
    @TestCase("hello test", " ")
    @TestCase("hello test", "h")
    @TestCase("hello test", "t")
    @TestCase("hello test", "l")
    @TestCase("hello test", "invalid")
    @TestCase("hello test", "hello test")
    @Test("string.split")
    public split(inp: string, separator: string) {
        // Transpile
        const lua = util.transpileString(
            `return JSONStringify("${inp}".split("${separator}"))`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(JSON.stringify(inp.split(separator)));
    }

    @TestCase("hello test", 1)
    @TestCase("hello test", 2)
    @TestCase("hello test", 3)
    @TestCase("hello test", 99)
    @Test("string.charAt")
    public charAt(inp: string, index: number) {
        // Transpile
        const lua = util.transpileString(
            `return "${inp}".charAt(${index})`
        );

        // Execute
        const result = util.executeLua(lua);

        // Assert
        Expect(result).toBe(inp.charAt(index));
    }

    @TestCase("abcd", 3)
    @TestCase("abcde", 3)
    @TestCase("abcde", 0)
    @TestCase("a", 0)
    @Test("string index")
    public index(input: string, index: number) {
        const lua = util.transpileString(`return "${input}"[${index}];`);

        const result = util.executeLua(lua);

        Expect(result).toBe(input[index]);
    }
}
