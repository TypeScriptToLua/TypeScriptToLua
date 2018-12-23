import { Expect, Test, TestCase } from "alsatian";
import { TranspileError } from "../../src/Errors";

import * as util from "../src/util";
const fs = require("fs");

export class AssignmentTests {

    public static readonly funcAssignTestCode =
        `let func: {(s: string): string} = function(s) { return s + "+func"; };
         let lambda: (s: string) => string = s => s + "+lambda";
         let thisFunc: {(this: Foo, s: string): string} = function(s) { return s + "+thisFunc"; };
         let thisLambda: (this: Foo, s: string) => string = s => s + "+thisLambda";
         class Foo {
             method(s: string): string { return s + "+method"; }
             lambdaProp: (s: string) => string = s => s + "+lambdaProp";
             voidMethod(this: void, s: string): string { return s + "+voidMethod"; }
             voidLambdaProp: (this: void, s: string) => string = s => s + "+voidLambdaProp";
             static staticMethod(s: string): string { return s + "+staticMethod"; }
             static staticLambdaProp: (s: string) => string = s => s + "+staticLambdaProp";
             static thisStaticMethod(this: Foo, s: string): string { return s + "+thisStaticMethod"; }
             static thisStaticLambdaProp: (this: Foo, s: string) => string = s => s + "+thisStaticLambdaProp";
         }
         const foo = new Foo();`;

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
        Expect(result).toBe(undefined);
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

    @TestCase("func", "lambda", "foo+lambda")
    @TestCase("func", "s => s", "foo")
    @TestCase("func", "function(s) { return s; }", "foo")
    @TestCase("func", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("func", "s => foo.method(s)", "foo+method")
    @TestCase("func", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("func", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("func", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("func", "foo.voidMethod", "foo+voidMethod")
    @TestCase("func", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("lambda", "func", "foo+func")
    @TestCase("lambda", "s => s", "foo")
    @TestCase("lambda", "function(s) { return s; }", "foo")
    @TestCase("lambda", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("lambda", "s => foo.method(s)", "foo+method")
    @TestCase("lambda", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("lambda", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("lambda", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("lambda", "foo.voidMethod", "foo+voidMethod")
    @TestCase("lambda", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("Foo.staticMethod", "func", "foo+func")
    @TestCase("Foo.staticMethod", "lambda", "foo+lambda")
    @TestCase("Foo.staticMethod", "s => s", "foo")
    @TestCase("Foo.staticMethod", "function(s) { return s; }", "foo")
    @TestCase("Foo.staticMethod", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("Foo.staticMethod", "s => foo.method(s)", "foo+method")
    @TestCase("Foo.staticMethod", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("Foo.staticMethod", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("Foo.staticMethod", "foo.voidMethod", "foo+voidMethod")
    @TestCase("Foo.staticMethod", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("Foo.staticLambdaProp", "func", "foo+func")
    @TestCase("Foo.staticLambdaProp", "lambda", "foo+lambda")
    @TestCase("Foo.staticLambdaProp", "s => s", "foo")
    @TestCase("Foo.staticLambdaProp", "function(s) { return s; }", "foo")
    @TestCase("Foo.staticLambdaProp", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("Foo.staticLambdaProp", "s => foo.method(s)", "foo+method")
    @TestCase("Foo.staticLambdaProp", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("Foo.staticLambdaProp", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("Foo.staticLambdaProp", "foo.voidMethod", "foo+voidMethod")
    @TestCase("Foo.staticLambdaProp", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("foo.voidMethod", "func", "foo+func")
    @TestCase("foo.voidMethod", "lambda", "foo+lambda")
    @TestCase("foo.voidMethod", "s => s", "foo")
    @TestCase("foo.voidMethod", "function(s) { return s; }", "foo")
    @TestCase("foo.voidMethod", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("foo.voidMethod", "s => foo.method(s)", "foo+method")
    @TestCase("foo.voidMethod", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("foo.voidMethod", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("foo.voidMethod", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("foo.voidMethod", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("foo.voidLambdaProp", "func", "foo+func")
    @TestCase("foo.voidLambdaProp", "lambda", "foo+lambda")
    @TestCase("foo.voidLambdaProp", "s => s", "foo")
    @TestCase("foo.voidLambdaProp", "function(s) { return s; }", "foo")
    @TestCase("foo.voidLambdaProp", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("foo.voidLambdaProp", "s => foo.method(s)", "foo+method")
    @TestCase("foo.voidLambdaProp", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("foo.voidLambdaProp", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("foo.voidLambdaProp", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("foo.voidLambdaProp", "foo.voidMethod", "foo+voidMethod")
    @TestCase("func", "(func as (string | ((s: string) => string)))", "foo+func")
    @TestCase("func", "<(s: string) => string>lambda", "foo+lambda")
    @TestCase("func", "lambda as ((s: string) => string)", "foo+lambda")
    @Test("Valid function assignment")
    public validFunctionAssignment(func: string, assignTo: string, expectResult: string): void {
        const code = `${AssignmentTests.funcAssignTestCode} ${func} = ${assignTo}; return ${func}("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("func", "foo+func")
    @TestCase("lambda", "foo+lambda")
    @TestCase("Foo.staticMethod", "foo+staticMethod")
    @TestCase("Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("foo.voidMethod", "foo+voidMethod")
    @TestCase("foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("s => s", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("function(this: void, s: string) { return s; }", "foo")
    @TestCase("func", "foo+func", "string | ((s: string) => string)")
    @TestCase("func", "foo+func", "T")
    @TestCase("<(s: string) => string>func", "foo+func")
    @TestCase("func as ((s: string) => string)", "foo+func")
    @Test("Valid function argument")
    public validFunctionArgument(func: string, expectResult: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function takesFunc<T extends ((s: string) => string)>(fn: ${funcType}) {
                          return (fn as any)("foo");
                      }
                      return takesFunc(${func});`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("func", "foo+func")
    @TestCase("lambda", "foo+lambda")
    @TestCase("Foo.staticMethod", "foo+staticMethod")
    @TestCase("Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("foo.voidMethod", "foo+voidMethod")
    @TestCase("foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("s => s", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("function(this: void, s: string) { return s; }", "foo")
    @TestCase("func", "foo+func", "string | ((s: string) => string)")
    @TestCase("func", "foo+func", "T")
    @TestCase("<(s: string) => string>func", "foo+func")
    @TestCase("func as ((s: string) => string)", "foo+func")
    @Test("Valid function return")
    public validFunctionReturn(func: string, expectResult: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function returnsFunc<T extends ((s: string) => string)>(): ${funcType} {
                          return ${func};
                      }
                      const fn = returnsFunc();
                      return fn("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("foo.method", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("foo.method", "s => s", "foo")
    @TestCase("foo.method", "function(s) { return s; }", "foo")
    @TestCase("foo.method", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.method", "s => func(s)", "foo+func")
    @TestCase("foo.method", "s => lambda(s)", "foo+lambda")
    @TestCase("foo.method", "Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("foo.method", "Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("foo.method", "thisFunc", "foo+thisFunc")
    @TestCase("foo.method", "thisLambda", "foo+thisLambda")
    @TestCase("foo.lambdaProp", "foo.method", "foo+method")
    @TestCase("foo.lambdaProp", "s => s", "foo")
    @TestCase("foo.lambdaProp", "function(s) { return s; }", "foo")
    @TestCase("foo.lambdaProp", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.lambdaProp", "s => func(s)", "foo+func")
    @TestCase("foo.lambdaProp", "s => lambda(s)", "foo+lambda")
    @TestCase("foo.lambdaProp", "Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("foo.lambdaProp", "Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("foo.lambdaProp", "thisFunc", "foo+thisFunc")
    @TestCase("foo.lambdaProp", "thisLambda", "foo+thisLambda")
    @TestCase("Foo.thisStaticMethod", "foo.method", "foo+method")
    @TestCase("Foo.thisStaticMethod", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.thisStaticMethod", "s => s", "foo")
    @TestCase("Foo.thisStaticMethod", "function(s) { return s; }", "foo")
    @TestCase("foo.thisStaticMethod", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("Foo.thisStaticMethod", "s => func(s)", "foo+func")
    @TestCase("Foo.thisStaticMethod", "s => lambda(s)", "foo+lambda")
    @TestCase("Foo.thisStaticMethod", "Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("Foo.thisStaticMethod", "thisFunc", "foo+thisFunc")
    @TestCase("Foo.thisStaticMethod", "thisLambda", "foo+thisLambda")
    @TestCase("Foo.thisStaticLambdaProp", "foo.method", "foo+method")
    @TestCase("Foo.thisStaticLambdaProp", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.thisStaticLambdaProp", "s => s", "foo")
    @TestCase("Foo.thisStaticLambdaProp", "function(s) { return s; }", "foo")
    @TestCase("foo.thisStaticLambdaProp", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("Foo.thisStaticLambdaProp", "s => func(s)", "foo+func")
    @TestCase("Foo.thisStaticLambdaProp", "s => lambda(s)", "foo+lambda")
    @TestCase("Foo.thisStaticLambdaProp", "Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("Foo.thisStaticLambdaProp", "thisFunc", "foo+thisFunc")
    @TestCase("Foo.thisStaticLambdaProp", "thisLambda", "foo+thisLambda")
    @TestCase("thisFunc", "foo.method", "foo+method")
    @TestCase("thisFunc", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("thisFunc", "s => s", "foo")
    @TestCase("thisFunc", "function(s) { return s; }", "foo")
    @TestCase("thisFunc", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("thisFunc", "s => func(s)", "foo+func")
    @TestCase("thisFunc", "s => lambda(s)", "foo+lambda")
    @TestCase("thisFunc", "Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("thisFunc", "Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("thisFunc", "thisLambda", "foo+thisLambda")
    @TestCase("thisLambda", "foo.method", "foo+method")
    @TestCase("thisLambda", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("thisLambda", "s => s", "foo")
    @TestCase("thisLambda", "function(s) { return s; }", "foo")
    @TestCase("thisLambda", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("thisLambda", "s => func(s)", "foo+func")
    @TestCase("thisLambda", "s => lambda(s)", "foo+lambda")
    @TestCase("thisLambda", "Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("thisLambda", "Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("thisLambda", "thisFunc", "foo+thisFunc")
    @TestCase("foo.method", "(foo.method as (string | ((this: Foo, s: string) => string))", "foo+method")
    @TestCase("foo.method", "<(this: Foo, s: string) => string>foo.lambdaProp", "foo+lambdaProp")
    @TestCase("foo.method", "foo.lambdaProp as ((this: Foo, s: string) => string)", "foo+lambdaProp")
    @Test("Valid method assignment")
    public validMethodAssignment(func: string, assignTo: string, expectResult: string): void {
        const code = `${AssignmentTests.funcAssignTestCode} ${func} = ${assignTo}; return ${func}("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("foo.method", "foo+method")
    @TestCase("foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("thisFunc", "foo+thisFunc")
    @TestCase("thisLambda", "foo+thisLambda")
    @TestCase("s => s", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.method", "foo+method", "string | ((this: Foo, s: string) => string)")
    @TestCase("foo.method", "foo+method", "T")
    @TestCase("<(this: Foo, s: string) => string>foo.method", "foo+method")
    @TestCase("foo.method as ((this: Foo, s: string) => string)", "foo+method")
    @Test("Valid method argument")
    public validMethodArgument(func: string, expectResult: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(this: Foo, s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function takesMethod<T extends ((this: Foo, s: string) => string)>(meth: ${funcType}) {
                          foo.method = meth as any;
                      }
                      takesMethod(${func});
                      return foo.method("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("foo.method", "foo+method")
    @TestCase("foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.thisStaticMethod", "foo+thisStaticMethod")
    @TestCase("Foo.thisStaticLambdaProp", "foo+thisStaticLambdaProp")
    @TestCase("thisFunc", "foo+thisFunc")
    @TestCase("thisLambda", "foo+thisLambda")
    @TestCase("s => s", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.method", "foo+method", "string | ((this: Foo, s: string) => string)")
    @TestCase("foo.method", "foo+method", "T")
    @TestCase("<(this: Foo, s: string) => string>foo.method", "foo+method")
    @TestCase("foo.method as ((this: Foo, s: string) => string)", "foo+method")
    @Test("Valid method return")
    public validMethodReturn(func: string, expectResult: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(this: Foo, s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function returnMethod<T extends ((this: Foo, s: string) => string)>(): ${funcType} {
                          return ${func};
                      }
                      foo.method = returnMethod();
                      return foo.method("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("func", "foo.method")
    @TestCase("func", "foo.lambdaProp")
    @TestCase("func", "Foo.thisStaticMethod")
    @TestCase("func", "Foo.thisStaticLambdaProp")
    @TestCase("func", "function(this: Foo, s: string) { return s; }")
    @TestCase("lambda", "foo.method")
    @TestCase("lambda", "foo.lambdaProp")
    @TestCase("lambda", "Foo.thisStaticMethod")
    @TestCase("lambda", "Foo.thisStaticLambdaProp")
    @TestCase("lambda", "function(this: Foo, s: string) { return s; }")
    @TestCase("foo.voidMethod", "foo.method")
    @TestCase("foo.voidMethod", "foo.lambdaProp")
    @TestCase("foo.voidMethod", "Foo.thisStaticMethod")
    @TestCase("foo.voidMethod", "Foo.thisStaticLambdaProp")
    @TestCase("foo.voidMethod", "function(this: Foo, s: string) { return s; }")
    @TestCase("foo.voidLambdaProp", "foo.method")
    @TestCase("foo.voidLambdaProp", "foo.lambdaProp")
    @TestCase("foo.voidLambdaProp", "Foo.thisStaticMethod")
    @TestCase("foo.voidLambdaProp", "Foo.thisStaticLambdaProp")
    @TestCase("foo.voidLambdaProp", "function(this: Foo, s: string) { return s; }")
    @TestCase("Foo.staticMethod", "foo.method")
    @TestCase("Foo.staticMethod", "foo.lambdaProp")
    @TestCase("Foo.staticMethod", "Foo.thisStaticMethod")
    @TestCase("Foo.staticMethod", "Foo.thisStaticLambdaProp")
    @TestCase("Foo.staticMethod", "function(this: Foo, s: string) { return s; }")
    @TestCase("Foo.staticLambdaProp", "foo.method")
    @TestCase("Foo.staticLambdaProp", "foo.lambdaProp")
    @TestCase("Foo.staticLambdaProp", "Foo.thisStaticMethod")
    @TestCase("Foo.staticLambdaProp", "Foo.thisStaticLambdaProp")
    @TestCase("Foo.staticLambdaProp", "function(this: Foo, s: string) { return s; }")
    @TestCase("func", "(foo.method as (string | ((this: Foo, s: string) => string)))")
    @TestCase("func", "<(s: string) => string>foo.method")
    @TestCase("func", "foo.method as ((s: string) => string)")
    @Test("Invalid function assignment")
    public invalidFunctionAssignment(func: string, assignTo: string): void {
        const code = `${AssignmentTests.funcAssignTestCode} ${func} = ${assignTo};`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from method to function. To fix, wrap the method in an arrow function.");
    }

    @TestCase("foo.method")
    @TestCase("foo.lambdaProp")
    @TestCase("Foo.thisStaticMethod")
    @TestCase("Foo.thisStaticLambdaProp")
    @TestCase("thisFunc")
    @TestCase("thisLambda")
    @TestCase("function(this: Foo, s: string) { return s; }")
    @TestCase("foo.method", "string | ((s: string) => string)")
    @TestCase("foo.method", "T")
    @Test("Invalid function argument")
    public invalidFunctionArgument(func: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      declare function takesFunc<T extends ((s: string) => string)>(fn: ${funcType});
                      takesFunc(${func});`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from method to function \"fn\". To fix, wrap the method in an arrow function.");
    }

    @TestCase("<(s: string) => string>foo.method")
    @TestCase("foo.method as ((s: string) => string)")
    @Test("Invalid function argument cast")
    public invalidFunctionArgumentCast(func: string): void {
        const code = `${AssignmentTests.funcAssignTestCode}
                      declare function takesFunc<T extends ((s: string) => string)>(fn: (s: string) => string);
                      takesFunc(${func});`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from method to function. To fix, wrap the method in an arrow function.");
    }

    @TestCase("foo.method")
    @TestCase("foo.lambdaProp")
    @TestCase("Foo.thisStaticMethod")
    @TestCase("Foo.thisStaticLambdaProp")
    @TestCase("thisFunc")
    @TestCase("thisLambda")
    @TestCase("function(this: Foo, s: string) { return s; }")
    @TestCase("foo.method", "string | ((s: string) => string)")
    @TestCase("foo.method", "T")
    @TestCase("<(s: string) => string>foo.method")
    @TestCase("foo.method as ((s: string) => string)")
    @Test("Invalid function return")
    public invalidFunctionReturn(func: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function returnsFunc<T extends ((s: string) => string)>(): ${funcType} {
                          return ${func};
                      }`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from method to function. To fix, wrap the method in an arrow function.");
    }

    @TestCase("foo.method", "func")
    @TestCase("foo.method", "lambda")
    @TestCase("foo.method", "Foo.staticMethod")
    @TestCase("foo.method", "Foo.staticLambdaProp")
    @TestCase("foo.method", "foo.voidMethod")
    @TestCase("foo.method", "foo.voidLambdaProp")
    @TestCase("foo.method", "function(this: void, s: string) { return s; }")
    @TestCase("foo.lambdaProp", "func")
    @TestCase("foo.lambdaProp", "lambda")
    @TestCase("foo.lambdaProp", "Foo.staticMethod")
    @TestCase("foo.lambdaProp", "Foo.staticLambdaProp")
    @TestCase("foo.lambdaProp", "foo.voidMethod")
    @TestCase("foo.lambdaProp", "foo.voidLambdaProp")
    @TestCase("foo.lambdaProp", "function(this: void, s: string) { return s; }")
    @TestCase("Foo.thisStaticMethod", "func")
    @TestCase("Foo.thisStaticMethod", "lambda")
    @TestCase("Foo.thisStaticMethod", "Foo.staticMethod")
    @TestCase("Foo.thisStaticMethod", "Foo.staticLambdaProp")
    @TestCase("Foo.thisStaticMethod", "foo.voidMethod")
    @TestCase("Foo.thisStaticMethod", "foo.voidLambdaProp")
    @TestCase("Foo.thisStaticMethod", "function(this: void, s: string) { return s; }")
    @TestCase("Foo.thisStaticLambdaProp", "func")
    @TestCase("Foo.thisStaticLambdaProp", "lambda")
    @TestCase("Foo.thisStaticLambdaProp", "Foo.staticMethod")
    @TestCase("Foo.thisStaticLambdaProp", "Foo.staticLambdaProp")
    @TestCase("Foo.thisStaticLambdaProp", "foo.voidMethod")
    @TestCase("Foo.thisStaticLambdaProp", "foo.voidLambdaProp")
    @TestCase("Foo.thisStaticLambdaProp", "function(this: void, s: string) { return s; }")
    @TestCase("thisFunc", "func")
    @TestCase("thisFunc", "lambda")
    @TestCase("thisFunc", "Foo.staticMethod")
    @TestCase("thisFunc", "Foo.staticLambdaProp")
    @TestCase("thisFunc", "foo.voidMethod")
    @TestCase("thisFunc", "foo.voidLambdaProp")
    @TestCase("thisFunc", "function(this: void, s: string) { return s; }")
    @TestCase("thisLambda", "func")
    @TestCase("thisLambda", "lambda")
    @TestCase("thisLambda", "Foo.staticMethod")
    @TestCase("thisLambda", "Foo.staticLambdaProp")
    @TestCase("thisLambda", "foo.voidMethod")
    @TestCase("thisLambda", "foo.voidLambdaProp")
    @TestCase("thisLambda", "function(this: void, s: string) { return s; }")
    @TestCase("foo.method", "(func as string | ((s: string) => string))")
    @TestCase("foo.method", "<(this: Foo, s: string) => string>func")
    @TestCase("foo.method", "func as ((this: Foo, s: string) => string)")
    @Test("Invalid method assignment")
    public invalidMethodAssignment(func: string, assignTo: string): void {
        const code = `${AssignmentTests.funcAssignTestCode} ${func} = ${assignTo};`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from function to method. To fix, wrap the function in an arrow function or declare"
            + " the function with an explicit 'this' parameter.");
    }

    @TestCase("func")
    @TestCase("lambda")
    @TestCase("Foo.staticMethod")
    @TestCase("Foo.staticLambdaProp")
    @TestCase("foo.voidMethod")
    @TestCase("foo.voidLambdaProp")
    @TestCase("function(this: void, s: string) { return s; }")
    @TestCase("func", "string | ((this: Foo, s: string) => string)")
    @TestCase("func", "T")
    @Test("Invalid method argument")
    public invalidMethodArgument(func: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(this: Foo, s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      declare function takesMethod<T extends ((this: Foo, s: string) => string)>(meth: ${funcType});
                      takesMethod(${func});`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from function to method \"meth\". To fix, wrap the function in an arrow function "
            + "or declare the function with an explicit 'this' parameter.");
    }

    @TestCase("<(this: Foo, s: string) => string>func")
    @TestCase("func as ((this: Foo, s: string) => string)")
    @Test("Invalid method argument cast")
    public invalidMethodArgumentCast(func: string): void {
        const code = `${AssignmentTests.funcAssignTestCode}
                      declare function takesMethod<T extends ((this: Foo, s: string) => string)>(
                          meth: (this: Foo, s: string) => string);
                      takesMethod(${func});`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from function to method. To fix, wrap the function in an arrow function "
            + "or declare the function with an explicit 'this' parameter.");
    }

    @TestCase("func")
    @TestCase("lambda")
    @TestCase("Foo.staticMethod")
    @TestCase("Foo.staticLambdaProp")
    @TestCase("foo.voidMethod")
    @TestCase("foo.voidLambdaProp")
    @TestCase("function(this: void, s: string) { return s; }")
    @TestCase("func", "string | ((this: Foo, s: string) => string)")
    @TestCase("func", "T")
    @TestCase("<(this: Foo, s: string) => string>func")
    @TestCase("func as ((this: Foo, s: string) => string)")
    @Test("Invalid method return")
    public invalidMethodReturn(func: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(this: Foo, s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function returnsMethod<T extends ((this: Foo, s: string) => string)>(): ${funcType} {
                          return ${func};
                      }`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from function to method. To fix, wrap the function in an arrow function "
            + "or declare the function with an explicit 'this' parameter.");
    }

    @Test("Interface method assignment")
    public interfaceMethodAssignment(): void {
        const code = `class Foo {
                          method(s: string): string { return s + "+method"; }
                          lambdaProp: (s: string) => string = s => s + "+lambdaProp";
                      }
                      interface IFoo {
                          method: (s: string) => string;
                          lambdaProp(s: string): string;
                      }
                      const foo: IFoo = new Foo();
                      return foo.method("foo") + "|" + foo.lambdaProp("bar");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo+method|bar+lambdaProp");
    }

    @Test("Valid function tuple assignment")
    public validFunctionTupleAssignment(): void {
        const code = `interface Func { (s: string): string; }
                      function getTuple(): [number, Func] { return [1, s => s]; }
                      let [i, f]: [number, Func] = getTuple();
                      return f("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Invalid function tuple assignment")
    public invalidFunctionTupleAssignment(): void {
        const code = `interface Func { (s: string): string; }
                      interface Meth { (this: {}, s: string): string; }
                      declare function getTuple(): [number, Meth];
                      let [i, f]: [number, Func] = getTuple();`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from method to function. To fix, wrap the method in an arrow function.");
    }

    @Test("Valid method tuple assignment")
    public validMethodTupleAssignment(): void {
        const code = `interface Foo { method(s: string): string; }
                      interface Meth { (this: Foo, s: string): string; }
                      let meth: Meth = s => s;
                      function getTuple(): [number, Meth] { return [1, meth]; }
                      let [i, f]: [number, Meth] = getTuple();
                      let foo: Foo = {method: f};
                      return foo.method("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Invalid method tuple assignment")
    public invalidMethodTupleAssignment(): void {
        const code = `interface Func { (s: string): string; }
                      interface Meth { (this: {}, s: string): string; }
                      declare function getTuple(): [number, Func];
                      let [i, f]: [number, Meth] = getTuple();`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from function to method. To fix, wrap the function in an arrow function or declare"
            + " the function with an explicit 'this' parameter.");
    }

    @Test("Valid interface method assignment")
    public validInterfaceMethodAssignment(): void {
        const code = `interface A { fn(this: void, s: string): string; }
                      interface B { fn(this: void, s: string): string; }
                      const a: A = { fn(this: void, s) { return s; } };
                      const b: B = a;
                      return b.fn("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Invalid interface method assignment")
    public invalidInterfaceMethodAssignment(): void {
        const code = `interface A { fn(s: string): string; }
                      interface B { fn(this: void, s: string): string; }
                      declare const a: A;
                      const b: B = a;`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported conversion from method to function \"fn\". To fix, wrap the method in an arrow function.");
    }

    @TestCase("(s: string) => string", ["foo"], "foobar")
    @TestCase("{(s: string): string}", ["foo"], "foobar")
    @TestCase("(s1: string, s2: string) => string", ["foo", "baz"], "foobaz")
    @TestCase("{(s1: string, s2: string): string}", ["foo", "baz"], "foobaz")
    @Test("Valid function overload assignment")
    public validFunctionOverloadAssignment(assignType: string, args: string[], expectResult: string): void {
        const code = `interface O {
                          (s1: string, s2: string): string;
                          (s: string): string;
                      }
                      const o: O = (s1: string, s2?: string) => s1 + (s2 || "bar");
                      let f: ${assignType} = o;
                      return f(${args.map(a => "\"" + a + "\"").join(", ")});`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("(s: string) => string")
    @TestCase("(s1: string, s2: string) => string")
    @TestCase("{(s: string): string}")
    @TestCase("{(this: {}, s1: string, s2: string): string}")
    @Test("Invalid function overload assignment")
    public invalidFunctionOverloadAssignment(assignType: string): void {
        const code = `interface O {
                          (this: {}, s1: string, s2: string): string;
                          (s: string): string;
                      }
                      declare const o: O;
                      let f: ${assignType} = o;`;
        Expect(() => util.transpileString(code)).toThrowError(
            TranspileError,
            "Unsupported assignment of mixed function/method overload. "
            + "Overloads should either be all functions or all methods, but not both.");
    }
}
