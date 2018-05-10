import { Expect, Test, TestCase, FocusTest } from "alsatian";
import { TranspileError } from "../../src/Transpiler";

import * as util from "../src/util";
const fs = require("fs");

export class AssignmentTests {

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3,b = "4"}`)
    @Test("Const assignment")
    public constAssignment(inp: string, out: string) {
        const lua = util.transpileString(`const myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out}`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3,b = "4"}`)
    @Test("Const assignment")
    public letAssignment(inp: string, out: string) {
        const lua = util.transpileString(`let myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out}`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3,b = "4"}`)
    @Test("Const assignment")
    public varAssignment(inp: string, out: string) {
        const lua = util.transpileString(`var myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out}`);
    }

    @TestCase("var myvar;")
    @TestCase("let myvar;")
    @TestCase("const myvar;")
    @TestCase("const myvar = null;")
    @TestCase("const myvar = undefined;")
    @Test("Null assignments")
    public nullAssignment(declaration: string) {
        const lua = util.transpileString(declaration + " return myvar;");
        const result = util.executeLua(lua);
        Expect(result).toBe(undefined);
    }

    @TestCase(["a", "b"], ["e", "f"])
    @TestCase(["a", "b"], ["e", "f", "g"])
    @TestCase(["a", "b", "c"], ["e", "f", "g"])
    @Test("Binding pattern assignment")
    public bindingPattern(input: string[], values: string[]) {
        const pattern = input.join(",");
        const initializer = values.map(v => `"${v}"`).join(",");

        const lua = util.transpileString(`const [${pattern}] = [${initializer}]; return [${pattern}].join("-");`);
        const result = util.executeLua(lua);

        Expect(result).toBe(values.slice(0, input.length).join("-"));
    }

    @Test("Ellipsis binding pattern")
    public ellipsisBindingPattern() {
        Expect(() => util.transpileString("let [a,b,...c] = [1,2,3];"))
            .toThrowError(Error, "Ellipsis destruction is not allowed.");
    }
}
