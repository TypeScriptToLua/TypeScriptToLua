import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class AssignmentTests {

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a=3,b="4"}`)
    @Test("Const assignment")
    public constAssignment(inp: string, out: string) {
        var lua = util.transpileString(`const myvar = ${inp};`)
        Expect(lua).toBe(`local myvar = ${out}`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a=3,b="4"}`)
    @Test("Const assignment")
    public letAssignment(inp: string, out: string) {
        var lua = util.transpileString(`let myvar = ${inp};`)
        Expect(lua).toBe(`local myvar = ${out}`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a=3,b="4"}`)
    @Test("Const assignment")
    public varAssignment(inp: string, out: string) {
        var lua = util.transpileString(`var myvar = ${inp};`)
        Expect(lua).toBe(`local myvar = ${out}`);
    }
}
