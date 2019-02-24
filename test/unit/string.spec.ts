import { Expect, Test, TestCase } from "alsatian";
import { TranspileError } from "../../src/TranspileError";
import * as util from "../src/util";

export class StringTests
{
    @Test("Unsuported string function")
    public stringUnsuportedFunction(): void {
        // Assert
        Expect(() => {
            util.transpileString(
                `return "test".testThisIsNoMember()`
            );
        }).toThrowError(TranspileError, "Unsupported property on string: testThisIsNoMember");
    }

    @Test("Suported lua string function")
    public stringSuportedLuaFunction(): void {
        Expect(util.transpileAndExecute(
                `return "test".upper()`,
                undefined,
                undefined,
                `interface String { upper(): string; }`
            )
        ).toBe("TEST");
    }

    @TestCase([])
    @TestCase([65])
    @TestCase([65, 66])
    @TestCase([65, 66, 67])
    @Test("String.fromCharCode")
    public stringFromCharcode(inp: number[]): void
    {
        const result = util.transpileAndExecute(
            `return String.fromCharCode(${inp.toString()})`
        );

        // Assert
        Expect(result).toBe(String.fromCharCode(...inp));
    }

    @TestCase(12, 23, 43)
    @TestCase("test", "hello", "bye")
    @TestCase("test", 42, "bye")
    @TestCase("test", 42, 12)
    @Test("Template Strings")
    public templateStrings(a: any, b: any, c: any): void {
        // Transpile
        const a1 = typeof(a) === "string" ? "'" + a + "'" : a;
        const b1 = typeof(b) === "string" ? "'" + b + "'" : b;
        const c1 = typeof(c) === "string" ? "'" + c + "'" : c;

        const result = util.transpileAndExecute(
            "let a = " + a1 + "; let b = " + b1 + "; let c = " + c1 + "; return `${a} ${b} test ${c}`;"
        );

        // Assert
        Expect(result).toBe(`${a} ${b} test ${c}`);
    }

    @TestCase("hello test", "", "")
    @TestCase("hello test", " ", "")
    @TestCase("hello test", "hello", "")
    @TestCase("hello test", "test", "")
    @TestCase("hello test", "test", "world")
    @Test("string.replace")
    public replace<T>(inp: string, searchValue: string, replaceValue: string): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".replace("${searchValue}", "${replaceValue}");`
        );

        // Assert
        Expect(result).toBe(inp.replace(searchValue, replaceValue));
    }

    @TestCase(["", ""], "")
    @TestCase(["hello", "test"], "hellotest")
    @TestCase(["hello", "test", "bye"], "hellotestbye")
    @TestCase(["hello", 42], "hello42")
    @TestCase([42, "hello"], "42hello")
    @Test("string.concat[+]")
    public concat(inp: any[], expected: string): void {
        const concatStr = inp.map(elem => typeof(elem) === "string" ? `"${elem}"` : elem).join(" + ");

        // Transpile/Execute
        const result = util.transpileAndExecute(
            `return ${concatStr}`
        );

        // Assert
        Expect(result).toBe(expected);
    }
    @TestCase("", ["", ""])
    @TestCase("hello", ["test"])
    @TestCase("hello", [])
    @TestCase("hello", ["test", "bye"])
    @Test("string.concatFct")
    public concatFct(str: string, param: string[]): void {
        const paramStr = param.map(elem => `"${elem}"`).join(", ");
        const result = util.transpileAndExecute(
            `return "${str}".concat(${paramStr})`
        );
        // Assert
        Expect(result).toBe(str.concat(...param));
    }
    @TestCase("hello test", "")
    @TestCase("hello test", "t")
    @TestCase("hello test", "h")
    @TestCase("hello test", "invalid")
    @Test("string.indexOf")
    public indexOf(inp: string, searchValue: string): void
    {
        const result = util.transpileAndExecute(`return "${inp}".indexOf("${searchValue}")`);

        // Assert
        Expect(result).toBe(inp.indexOf(searchValue));
    }

    @TestCase("hello test", "t", 5)
    @TestCase("hello test", "t", 6)
    @TestCase("hello test", "t", 7)
    @TestCase("hello test", "h", 4)
    @Test("string.indexOf with offset")
    public indexOfOffset(inp: string, searchValue: string, offset: number): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".indexOf("${searchValue}", ${offset})`
        );

        // Assert
        Expect(result).toBe(inp.indexOf(searchValue, offset));
    }

    @TestCase("hello test", "t", 4, 3)
    @TestCase("hello test", "h", 3, 4)
    @Test("string.indexOf with offset expression")
    public indexOfOffsetWithExpression(inp: string, searchValue: string, x: number, y: number): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".indexOf("${searchValue}", 2 > 1 && ${x} || ${y})`
        );

        // Assert
        Expect(result).toBe(inp.indexOf(searchValue, x));
    }
    @TestCase("hello test")
    @TestCase("hello test", 0)
    @TestCase("hello test", 1)
    @TestCase("hello test", 1, 2)
    @TestCase("hello test", 1, 5)
    @Test("string.slice")
    public slice(inp: string, start?: number, end?: number): void
    {
        // Transpile/Execute
        const paramStr = start? (end ? `${start}, ${end}` : `${start}`):'';
        const result = util.transpileAndExecute(
            `return "${inp}".slice(${paramStr})`
        );

        // Assert
        Expect(result).toBe(inp.slice(start, end));
    }
    @TestCase("hello test", 0)
    @TestCase("hello test", 1)
    @TestCase("hello test", 1, 2)
    @TestCase("hello test", 1, 5)
    @Test("string.substring")
    public substring(inp: string, start: number, end?: number): void
    {
        // Transpile/Execute
        const paramStr = end ? `${start}, ${end}` : `${start}`;
        const result = util.transpileAndExecute(
            `return "${inp}".substring(${paramStr})`
        );

        // Assert
        Expect(result).toBe(inp.substring(start, end));
    }

    @TestCase("hello test", 1, 0)
    @TestCase("hello test", 3, 0, 5)
    @Test("string.substring with expression")
    public substringWithExpression(inp: string, start: number, ignored: number, end?: number): void
    {
        // Transpile/Execute
        const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
        const result = util.transpileAndExecute(
            `return "${inp}".substring(${paramStr})`
        );

        // Assert
        Expect(result).toBe(inp.substring(start, end));
    }

    @TestCase("hello test", 0)
    @TestCase("hello test", 1)
    @TestCase("hello test", 1, 2)
    @TestCase("hello test", 1, 5)
    @Test("string.substr")
    public substr(inp: string, start: number, end?: number): void
    {
        // Transpile/Execute
        const paramStr = end ? `${start}, ${end}` : `${start}`;
        const result = util.transpileAndExecute(
            `return "${inp}".substr(${paramStr})`
        );

        // Assert
        Expect(result).toBe(inp.substr(start, end));
    }

    @TestCase("hello test", 1, 0)
    @TestCase("hello test", 3, 0, 2)
    @Test("string.substr with expression")
    public substrWithExpression(inp: string, start: number, ignored: number, end?: number): void
    {
        // Transpile/Execute
        const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
        const result = util.transpileAndExecute(
            `return "${inp}".substr(${paramStr})`
        );

        // Assert
        Expect(result).toBe(inp.substr(start, end));
    }

    @TestCase("", 0)
    @TestCase("h", 1)
    @TestCase("hello", 5)
    @Test("string.length")
    public length(inp: string, expected: number): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".length`
        );

        // Assert
        Expect(result).toBe(inp.length);
    }

    @TestCase("hello TEST")
    @Test("string.toLowerCase")
    public toLowerCase(inp: string): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".toLowerCase()`
        );

        // Assert
        Expect(result).toBe(inp.toLowerCase());
    }

    @TestCase("hello test")
    @Test("string.toUpperCase")
    public toUpperCase(inp: string): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".toUpperCase()`
        );

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
    public split(inp: string, separator: string): void
    {
        const result = util.transpileAndExecute(
            `return JSONStringify("${inp}".split("${separator}"))`
        );

        // Assert
        Expect(result).toBe(JSON.stringify(inp.split(separator)));
    }

    @TestCase("hello test", 1)
    @TestCase("hello test", 2)
    @TestCase("hello test", 3)
    @TestCase("hello test", 99)
    @Test("string.charAt")
    public charAt(inp: string, index: number): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".charAt(${index})`
        );

        // Assert
        Expect(result).toBe(inp.charAt(index));
    }

    @TestCase("hello test", 1)
    @TestCase("hello test", 2)
    @TestCase("hello test", 3)
    @Test("string.charCodeAt")
    public charCodeAt(inp: string, index: number): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".charCodeAt(${index})`
        );

        // Assert
        Expect(result).toBe(inp.charCodeAt(index));
    }

    @TestCase("hello test", 1, 0)
    @TestCase("hello test", 1, 2)
    @TestCase("hello test", 3, 2)
    @TestCase("hello test", 3, 99)
    @Test("string.charAt with expression")
    public charAtWithExpression(inp: string, index: number, ignored: number): void
    {
        const result = util.transpileAndExecute(
            `return "${inp}".charAt(2 > 1 && ${index} || ${ignored})`
        );

        // Assert
        Expect(result).toBe(inp.charAt(index));
    }

    @TestCase("abcd", 3)
    @TestCase("abcde", 3)
    @TestCase("abcde", 0)
    @TestCase("a", 0)
    @Test("string index")
    public index(input: string, index: number): void
    {
        const result = util.transpileAndExecute(`return "${input}"[${index}];`);

        Expect(result).toBe(input[index]);
    }
}
