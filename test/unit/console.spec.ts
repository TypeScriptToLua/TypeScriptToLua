import { Expect, Test, TestCase, IgnoreTest, FocusTest } from "alsatian";
import * as util from "../src/util";

export class ConsoleTests {

    @TestCase("console.log()", "print();")
    @TestCase('console.log("Hello")', 'print("Hello");')
    @TestCase('console.log("Hello %s", "there")', 'print(string.format("Hello %s", "there"));')
    @TestCase('console.log("Hello", "There")', 'print("Hello", "There");')
    @TestCase("console.trace()", "print(debug.traceback());")
    @TestCase('console.trace("message")', 'print(debug.traceback("message"));')
    @TestCase('console.trace("Hello %s", "there")', 'print(debug.traceback(string.format("Hello %s", "there")));')
    @TestCase('console.trace("Hello", "there")', 'print(debug.traceback("Hello", "there"));')
    @TestCase("console.assert(false)", "assert(false);")
    @TestCase('console.assert(false, "message")', 'assert(false, "message");')
    @TestCase('console.assert(false, "message %s", "info")', 'assert(false, string.format("message %s", "info"));')
    @TestCase('console.assert(false, "message", "more")', 'assert(false, "message", "more");')
    @Test("Console")
    public testConsoleCalls(inp: string, expected: string): void {
        // Transpile
        const lua = util.transpileString(inp);

        // Assert
        Expect(lua).toBe(expected);
    }

}