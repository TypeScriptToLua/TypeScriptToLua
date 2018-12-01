import { Expect, Test, TestCase } from "alsatian";
import { TranspileError } from "../../src/Errors";

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
    public constAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`const myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3,b = "4"}`)
    @Test("Const assignment")
    public letAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`let myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1,2,3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3,b = "4"}`)
    @Test("Const assignment")
    public varAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`var myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase("var myvar;")
    @TestCase("let myvar;")
    @TestCase("const myvar;")
    @TestCase("const myvar = null;")
    @TestCase("const myvar = undefined;")
    @Test("Null assignments")
    public nullAssignment(declaration: string): void {
        const lua = util.transpileString(declaration + " return myvar;");
        const result = util.executeLua(lua);
        Expect(result).toBe(null);
    }

    @TestCase(["a", "b"], ["e", "f"])
    @TestCase(["a", "b"], ["e", "f", "g"])
    @TestCase(["a", "b", "c"], ["e", "f", "g"])
    @Test("Binding pattern assignment")
    public bindingPattern(input: string[], values: string[]): void {
        const pattern = input.join(",");
        const initializer = values.map(v => `"${v}"`).join(",");

        const lua = util.transpileString(`const [${pattern}] = [${initializer}]; return [${pattern}].join("-");`);
        const result = util.executeLua(lua);

        Expect(result).toBe(values.slice(0, input.length).join("-"));
    }

    @Test("Ellipsis binding pattern")
    public ellipsisBindingPattern(): void {
        Expect(() => util.transpileString("let [a,b,...c] = [1,2,3];"))
            .toThrowError(Error, "Ellipsis destruction is not allowed.");
    }

    @Test("TupleReturn assignment")
    public tupleReturnFunction(): void {
        const code = `/** @tupleReturn */\n`
                   + `declare function abc() { return [1,2,3]; }\n`
                   + `let [a,b] = abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a,b=abc();");
    }

    @Test("TupleReturn Single assignment")
    public tupleReturnSingleAssignment(): void {
        const code = `/** @tupleReturn */\n`
                   + `declare function abc(): [number, string]; }\n`
                   + `let a = abc();`
                   + `a = abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a = ({ abc() });\na = ({ abc() });");
    }

    @Test("TupleReturn interface assignment")
    public tupleReturnInterface(): void {
        const code = `interface def {\n`
                   + `/** @tupleReturn */\n`
                   + `abc();\n`
                   + `} declare const jkl : def;\n`
                   + `let [a,b] = jkl.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a,b=jkl:abc();");
    }

    @Test("TupleReturn namespace assignment")
    public tupleReturnNameSpace(): void {
        const code = `declare namespace def {\n`
                   + `/** @tupleReturn */\n`
                   + `function abc() {}\n`
                   + `}\n`
                   + `let [a,b] = def.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a,b=def.abc();");
    }

    @Test("TupleReturn method assignment")
    public tupleReturnMethod(): void {
        const code = `declare class def {\n`
                   + `/** @tupleReturn */\n`
                   + `abc() { return [1,2,3]; }\n`
                   + `} const jkl = new def();\n`
                   + `let [a,b] = jkl.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local jkl = def.new(true);\nlocal a,b=jkl:abc();");
    }

    @Test("TupleReturn functional")
    public tupleReturnFunctional(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const [a, b] = abc();
        return b + a;`;

        const lua = util.transpileString(code);

        const result = util.executeLua(lua);

        Expect(result).toBe("a3");
    }

    @Test("TupleReturn single")
    public tupleReturnSingle(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const res = abc();
        return res.length`;

        const lua = util.transpileString(code);

        const result = util.executeLua(lua);

        Expect(result).toBe(2);
    }

    @Test("TupleReturn in expression")
    public tupleReturnInExpression(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        return abc()[1] + abc()[0];`;

        const lua = util.transpileString(code);

        const result = util.executeLua(lua);

        Expect(result).toBe("a3");
    }

    @TestCase("and")
    @TestCase("local")
    @TestCase("nil")
    @TestCase("not")
    @TestCase("or")
    @TestCase("repeat")
    @TestCase("then")
    @TestCase("until")
    @Test("Keyword identifier error")
    public keywordIdentifierError(identifier: string): void {
        Expect(() => util.transpileString(`const ${identifier} = 3;`))
            .toThrowError(TranspileError, `Cannot use Lua keyword ${identifier} as identifier.`);
    }
}
