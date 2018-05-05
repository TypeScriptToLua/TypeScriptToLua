import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class ObjectLiteralTests {

    @TestCase(`{a:3,b:"4"}`, `{a = 3,b = "4"}`)
    @TestCase(`{"a":3,b:"4"}`, `{["a"] = 3,b = "4"}`)
    @TestCase(`{["a"]:3,b:"4"}`, `{["a"] = 3,b = "4"}`)
    @TestCase(`{["a"+123]:3,b:"4"}`, `{["a" .. 123] = 3,b = "4"}`)
    @TestCase(`{[myFunc()]:3,b:"4"}`, `{[myFunc()] = 3,b = "4"}`)
    @Test("Object Literal")
    public objectLiteral(inp: string, out: string) {
        var lua = util.transpileString(`const myvar = ${inp};`)
        Expect(lua).toBe(`local myvar = ${out}`);
    }
}
