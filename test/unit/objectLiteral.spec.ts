import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class ObjectLiteralTests {

    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"};`)
    @TestCase(`{"a":3,b:"4"}`, `{a = 3, b = "4"};`)
    @TestCase(`{["a"]:3,b:"4"}`, `{a = 3, b = "4"};`)
    @TestCase(`{["a"+123]:3,b:"4"}`, `{["a" .. 123] = 3, b = "4"};`)
    @TestCase(`{[myFunc()]:3,b:"4"}`, `{[myFunc()] = 3, b = "4"};`)
    @TestCase(`{x}`, `{x = x};`)
    @Test("Object Literal")
    public objectLiteral(inp: string, out: string): void {
        const lua = util.transpileString(`const myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out}`);
    }

    @TestCase("3", 3)
    @Test("Shorthand Property Assignment")
    public ShorthandPropertyAssignment(input: string, expected: number): void {
        const result = util.transpileAndExecute(`const x = ${input}; const o = {x}; return o.x;`);
        Expect(result).toBe(expected);
    }
}
