import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
const fs = require("fs");

export class AssignmentTests {

    // Expect the passed lua string to be equal to the file's contents.
    private ExpectEqualToFile(lua: string, path: string) {
        const expected = fs.readFileSync(path).toString();
        Expect(lua).toBe(expected.trim().split("\r\n").join("\n"));
    }

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

    @Test("Destructing assignment")
    public destructingAssignment() {
        const lua = util.transpileFile("test/integration/testfiles/assignmentDestructing.ts");
        this.ExpectEqualToFile(lua, "test/integration/testfiles/assignmentDestructing.lua");
    }
}
