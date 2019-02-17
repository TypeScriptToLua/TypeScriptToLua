import { Expect, Test, TestCase } from "alsatian";
import { TranspileError } from "../../src/TranspileError";

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
             static voidStaticMethod(this: void, s: string): string { return s + "+voidStaticMethod"; }
             static voidStaticLambdaProp: (this: void, s: string) => string = s => s + "+voidStaticLambdaProp";
             static staticMethod(s: string): string { return s + "+staticMethod"; }
             static staticLambdaProp: (s: string) => string = s => s + "+staticLambdaProp";
         }
         const foo = new Foo();`;

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1, 2, 3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"}`)
    @Test("Const assignment")
    public constAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`const myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1, 2, 3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"}`)
    @Test("Let assignment")
    public letAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`let myvar = ${inp};`);
        Expect(lua).toBe(`local myvar = ${out};`);
    }

    @TestCase(`"abc"`, `"abc"`)
    @TestCase("3", "3")
    @TestCase("[1,2,3]", "{1, 2, 3}")
    @TestCase("true", "true")
    @TestCase("false", "false")
    @TestCase(`{a:3,b:"4"}`, `{a = 3, b = "4"}`)
    @Test("Var assignment")
    public varAssignment(inp: string, out: string): void {
        const lua = util.transpileString(`var myvar = ${inp};`);
        Expect(lua).toBe(`myvar = ${out};`);
    }

    @TestCase("var myvar;")
    @TestCase("let myvar;")
    @TestCase("const myvar = null;")
    @TestCase("const myvar = undefined;")
    @Test("Null assignments")
    public nullAssignment(declaration: string): void {
        const result = util.transpileAndExecute(declaration + " return myvar;");
        Expect(result).toBe(undefined);
    }

    @TestCase(["a", "b"], ["e", "f"])
    @TestCase(["a", "b"], ["e", "f", "g"])
    @TestCase(["a", "b", "c"], ["e", "f", "g"])
    @Test("Binding pattern assignment")
    public bindingPattern(input: string[], values: string[]): void {
        const pattern = input.join(",");
        const initializer = values.map(v => `"${v}"`).join(",");

        const tsCode = `const [${pattern}] = [${initializer}]; return [${pattern}].join("-");`;
        const result = util.transpileAndExecute(tsCode);

        Expect(result).toBe(values.slice(0, input.length).join("-"));
    }

    @Test("Ellipsis binding pattern")
    public ellipsisBindingPattern(): void {
        Expect(() => util.transpileString("let [a,b,...c] = [1,2,3];"))
            .toThrowError(Error, "Ellipsis destruction is not allowed.");
    }

    @Test("Tuple Assignment")
    public tupleAssignment(): void {
        const code = `function abc(): [number, number] { return [1, 2]; };
                      let t: [number, number] = abc();
                      return t[0] + t[1];`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(3);
    }

    @Test("TupleReturn assignment")
    public tupleReturnFunction(): void {
        const code = `/** @tupleReturn */\n`
                   + `declare function abc(): number[]\n`
                   + `let [a,b] = abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a, b = abc();");
    }

    @Test("TupleReturn Single assignment")
    public tupleReturnSingleAssignment(): void {
        const code = `/** @tupleReturn */\n`
                   + `declare function abc(): [number, string];\n`
                   + `let a = abc();`
                   + `a = abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a = ({abc()});\na = ({abc()});");
    }

    @Test("TupleReturn interface assignment")
    public tupleReturnInterface(): void {
        const code = `interface def {\n`
                   + `/** @tupleReturn */\n`
                   + `abc();\n`
                   + `} declare const jkl : def;\n`
                   + `let [a,b] = jkl.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a, b = jkl:abc();");
    }

    @Test("TupleReturn namespace assignment")
    public tupleReturnNameSpace(): void {
        const code = `declare namespace def {\n`
                   + `/** @tupleReturn */\n`
                   + `function abc() {}\n`
                   + `}\n`
                   + `let [a,b] = def.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local a, b = def.abc();");
    }

    @Test("TupleReturn method assignment")
    public tupleReturnMethod(): void {
        const code = `declare class def {\n`
                   + `/** @tupleReturn */\n`
                   + `abc() { return [1,2,3]; }\n`
                   + `} const jkl = new def();\n`
                   + `let [a,b] = jkl.abc();`;

        const lua = util.transpileString(code);
        Expect(lua).toBe("local jkl = def.new();\nlocal a, b = jkl:abc();");
    }

    @Test("TupleReturn functional")
    public tupleReturnFunctional(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const [a, b] = abc();
        return b + a;`;

        const result = util.transpileAndExecute(code);

        Expect(result).toBe("a3");
    }

    @Test("TupleReturn single")
    public tupleReturnSingle(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        const res = abc();
        return res.length`;

        const result = util.transpileAndExecute(code);

        Expect(result).toBe(2);
    }

    @Test("TupleReturn in expression")
    public tupleReturnInExpression(): void {
        const code = `/** @tupleReturn */
        function abc(): [number, string] { return [3, "a"]; }
        return abc()[1] + abc()[0];`;

        const result = util.transpileAndExecute(code);

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
    @TestCase("func", "(s => s)", "foo")
    @TestCase("func", "function(s) { return s; }", "foo")
    @TestCase("func", "(function(s) { return s; })", "foo")
    @TestCase("func", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("func", "s => foo.method(s)", "foo+method")
    @TestCase("func", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("func", "Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("func", "Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("func", "foo.voidMethod", "foo+voidMethod")
    @TestCase("func", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("lambda", "func", "foo+func")
    @TestCase("lambda", "s => s", "foo")
    @TestCase("lambda", "(s => s)", "foo")
    @TestCase("lambda", "function(s) { return s; }", "foo")
    @TestCase("lambda", "(function(s) { return s; })", "foo")
    @TestCase("lambda", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("lambda", "s => foo.method(s)", "foo+method")
    @TestCase("lambda", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("lambda", "Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("lambda", "Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("lambda", "foo.voidMethod", "foo+voidMethod")
    @TestCase("lambda", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("Foo.voidStaticMethod", "func", "foo+func")
    @TestCase("Foo.voidStaticMethod", "lambda", "foo+lambda")
    @TestCase("Foo.voidStaticMethod", "s => s", "foo")
    @TestCase("Foo.voidStaticMethod", "(s => s)", "foo")
    @TestCase("Foo.voidStaticMethod", "function(s) { return s; }", "foo")
    @TestCase("Foo.voidStaticMethod", "(function(s) { return s; })", "foo")
    @TestCase("Foo.voidStaticMethod", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("Foo.voidStaticMethod", "s => foo.method(s)", "foo+method")
    @TestCase("Foo.voidStaticMethod", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("Foo.voidStaticMethod", "Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("Foo.voidStaticMethod", "foo.voidMethod", "foo+voidMethod")
    @TestCase("Foo.voidStaticMethod", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("Foo.voidStaticLambdaProp", "func", "foo+func")
    @TestCase("Foo.voidStaticLambdaProp", "lambda", "foo+lambda")
    @TestCase("Foo.voidStaticLambdaProp", "s => s", "foo")
    @TestCase("Foo.voidStaticLambdaProp", "(s => s)", "foo")
    @TestCase("Foo.voidStaticLambdaProp", "function(s) { return s; }", "foo")
    @TestCase("Foo.voidStaticLambdaProp", "(function(s) { return s; })", "foo")
    @TestCase("Foo.voidStaticLambdaProp", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("Foo.voidStaticLambdaProp", "s => foo.method(s)", "foo+method")
    @TestCase("Foo.voidStaticLambdaProp", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("Foo.voidStaticLambdaProp", "Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("Foo.voidStaticLambdaProp", "foo.voidMethod", "foo+voidMethod")
    @TestCase("Foo.voidStaticLambdaProp", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("foo.voidMethod", "func", "foo+func")
    @TestCase("foo.voidMethod", "lambda", "foo+lambda")
    @TestCase("foo.voidMethod", "s => s", "foo")
    @TestCase("foo.voidMethod", "(s => s)", "foo")
    @TestCase("foo.voidMethod", "function(s) { return s; }", "foo")
    @TestCase("foo.voidMethod", "(function(s) { return s; })", "foo")
    @TestCase("foo.voidMethod", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("foo.voidMethod", "s => foo.method(s)", "foo+method")
    @TestCase("foo.voidMethod", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("foo.voidMethod", "Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("foo.voidMethod", "Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("foo.voidMethod", "foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("foo.voidLambdaProp", "func", "foo+func")
    @TestCase("foo.voidLambdaProp", "lambda", "foo+lambda")
    @TestCase("foo.voidLambdaProp", "s => s", "foo")
    @TestCase("foo.voidLambdaProp", "(s => s)", "foo")
    @TestCase("foo.voidLambdaProp", "function(s) { return s; }", "foo")
    @TestCase("foo.voidLambdaProp", "(function(s) { return s; })", "foo")
    @TestCase("foo.voidLambdaProp", "function(this: void, s: string) { return s; }", "foo")
    @TestCase("foo.voidLambdaProp", "s => foo.method(s)", "foo+method")
    @TestCase("foo.voidLambdaProp", "s => foo.lambdaProp(s)", "foo+lambdaProp")
    @TestCase("foo.voidLambdaProp", "Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("foo.voidLambdaProp", "Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("foo.voidLambdaProp", "foo.voidMethod", "foo+voidMethod")
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
    @TestCase("Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("foo.voidMethod", "foo+voidMethod")
    @TestCase("foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("s => s", "foo")
    @TestCase("(s => s)", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("(function(s) { return s; })", "foo")
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

    @TestCase("s => s", "foo")
    @TestCase("(s => s)", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("(function(s) { return s; })", "foo")
    @TestCase("function(this: void, s: string) { return s; }", "foo")
    @Test("Valid function expression argument with no signature")
    public validFunctionExpressionArgumentNoSignature(func: string, expectResult: string): void {
        const code = `${AssignmentTests.funcAssignTestCode}
                      const takesFunc: any = (fn: (s: string) => string) => {
                          return (fn as any)("foo");
                      }
                      return takesFunc(${func});`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("func", "foo+func")
    @TestCase("lambda", "foo+lambda")
    @TestCase("Foo.voidStaticMethod", "foo+voidStaticMethod")
    @TestCase("Foo.voidStaticLambdaProp", "foo+voidStaticLambdaProp")
    @TestCase("foo.voidMethod", "foo+voidMethod")
    @TestCase("foo.voidLambdaProp", "foo+voidLambdaProp")
    @TestCase("s => s", "foo")
    @TestCase("(s => s)", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("(function(s) { return s; })", "foo")
    @TestCase("function(this: void, s: string) { return s; }", "foo")
    @TestCase("func", "foo+func", "string | ((s: string) => string)")
    @TestCase("<(s: string) => string>func", "foo+func")
    @TestCase("func as ((s: string) => string)", "foo+func")
    @Test("Valid function return")
    public validFunctionReturn(func: string, expectResult: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function returnsFunc(): ${funcType} {
                          return ${func};
                      }
                      const fn = returnsFunc();
                      return (fn as any)("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("foo.method", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("foo.method", "s => s", "foo")
    @TestCase("foo.method", "function(s) { return s; }", "foo")
    @TestCase("foo.method", "(function(s) { return s; })", "foo")
    @TestCase("foo.method", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.method", "s => func(s)", "foo+func")
    @TestCase("foo.method", "s => lambda(s)", "foo+lambda")
    @TestCase("foo.method", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("foo.method", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("foo.method", "thisFunc", "foo+thisFunc")
    @TestCase("foo.method", "thisLambda", "foo+thisLambda")
    @TestCase("foo.lambdaProp", "foo.method", "foo+method")
    @TestCase("foo.lambdaProp", "s => s", "foo")
    @TestCase("foo.lambdaProp", "(s => s)", "foo")
    @TestCase("foo.lambdaProp", "function(s) { return s; }", "foo")
    @TestCase("foo.lambdaProp", "(function(s) { return s; })", "foo")
    @TestCase("foo.lambdaProp", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.lambdaProp", "s => func(s)", "foo+func")
    @TestCase("foo.lambdaProp", "s => lambda(s)", "foo+lambda")
    @TestCase("foo.lambdaProp", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("foo.lambdaProp", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("foo.lambdaProp", "thisFunc", "foo+thisFunc")
    @TestCase("foo.lambdaProp", "thisLambda", "foo+thisLambda")
    @TestCase("Foo.staticMethod", "foo.method", "foo+method")
    @TestCase("Foo.staticMethod", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.staticMethod", "s => s", "foo")
    @TestCase("Foo.staticMethod", "(s => s)", "foo")
    @TestCase("Foo.staticMethod", "function(s) { return s; }", "foo")
    @TestCase("Foo.staticMethod", "(function(s) { return s; })", "foo")
    @TestCase("Foo.staticMethod", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("Foo.staticMethod", "s => func(s)", "foo+func")
    @TestCase("Foo.staticMethod", "s => lambda(s)", "foo+lambda")
    @TestCase("Foo.staticMethod", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("Foo.staticMethod", "thisFunc", "foo+thisFunc")
    @TestCase("Foo.staticMethod", "thisLambda", "foo+thisLambda")
    @TestCase("Foo.staticLambdaProp", "foo.method", "foo+method")
    @TestCase("Foo.staticLambdaProp", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.staticLambdaProp", "s => s", "foo")
    @TestCase("Foo.staticLambdaProp", "(s => s)", "foo")
    @TestCase("Foo.staticLambdaProp", "function(s) { return s; }", "foo")
    @TestCase("Foo.staticLambdaProp", "(function(s) { return s; })", "foo")
    @TestCase("Foo.staticLambdaProp", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("Foo.staticLambdaProp", "s => func(s)", "foo+func")
    @TestCase("Foo.staticLambdaProp", "s => lambda(s)", "foo+lambda")
    @TestCase("Foo.staticLambdaProp", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("Foo.staticLambdaProp", "thisFunc", "foo+thisFunc")
    @TestCase("Foo.staticLambdaProp", "thisLambda", "foo+thisLambda")
    @TestCase("thisFunc", "foo.method", "foo+method")
    @TestCase("thisFunc", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("thisFunc", "s => s", "foo")
    @TestCase("thisFunc", "(s => s)", "foo")
    @TestCase("thisFunc", "function(s) { return s; }", "foo")
    @TestCase("thisFunc", "(function(s) { return s; })", "foo")
    @TestCase("thisFunc", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("thisFunc", "s => func(s)", "foo+func")
    @TestCase("thisFunc", "s => lambda(s)", "foo+lambda")
    @TestCase("thisFunc", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("thisFunc", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("thisFunc", "thisLambda", "foo+thisLambda")
    @TestCase("thisLambda", "foo.method", "foo+method")
    @TestCase("thisLambda", "foo.lambdaProp", "foo+lambdaProp")
    @TestCase("thisLambda", "s => s", "foo")
    @TestCase("thisLambda", "(s => s)", "foo")
    @TestCase("thisLambda", "function(s) { return s; }", "foo")
    @TestCase("thisLambda", "(function(s) { return s; })", "foo")
    @TestCase("thisLambda", "function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("thisLambda", "s => func(s)", "foo+func")
    @TestCase("thisLambda", "s => lambda(s)", "foo+lambda")
    @TestCase("thisLambda", "Foo.staticMethod", "foo+staticMethod")
    @TestCase("thisLambda", "Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("thisLambda", "thisFunc", "foo+thisFunc")
    @TestCase("foo.method", "<(this: Foo, s: string) => string>foo.lambdaProp", "foo+lambdaProp")
    @TestCase("foo.method", "foo.lambdaProp as ((this: Foo, s: string) => string)", "foo+lambdaProp")
    @Test("Valid method assignment")
    public validMethodAssignment(func: string, assignTo: string, expectResult: string): void {
        const code = `${AssignmentTests.funcAssignTestCode}
                      ${func} = ${assignTo};
                      foo.method = ${func};
                      return foo.method("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("foo.method", "foo+method")
    @TestCase("foo.lambdaProp", "foo+lambdaProp")
    @TestCase("Foo.staticMethod", "foo+staticMethod")
    @TestCase("Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("thisFunc", "foo+thisFunc")
    @TestCase("thisLambda", "foo+thisLambda")
    @TestCase("s => s", "foo")
    @TestCase("(s => s)", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("(function(s) { return s; })", "foo")
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
    @TestCase("Foo.staticMethod", "foo+staticMethod")
    @TestCase("Foo.staticLambdaProp", "foo+staticLambdaProp")
    @TestCase("thisFunc", "foo+thisFunc")
    @TestCase("thisLambda", "foo+thisLambda")
    @TestCase("s => s", "foo")
    @TestCase("(s => s)", "foo")
    @TestCase("function(s) { return s; }", "foo")
    @TestCase("(function(s) { return s; })", "foo")
    @TestCase("function(this: Foo, s: string) { return s; }", "foo")
    @TestCase("foo.method", "foo+method", "string | ((this: Foo, s: string) => string)")
    @TestCase("<(this: Foo, s: string) => string>foo.method", "foo+method")
    @TestCase("foo.method as ((this: Foo, s: string) => string)", "foo+method")
    @Test("Valid method return")
    public validMethodReturn(func: string, expectResult: string, funcType?: string): void {
        if (!funcType) {
            funcType = "(this: Foo, s: string) => string";
        }
        const code = `${AssignmentTests.funcAssignTestCode}
                      function returnMethod(): ${funcType} {
                          return ${func};
                      }
                      foo.method = returnMethod() as any;
                      return foo.method("foo");`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("func", "foo.method")
    @TestCase("func", "foo.lambdaProp")
    @TestCase("func", "Foo.staticMethod")
    @TestCase("func", "Foo.staticLambdaProp")
    @TestCase("func", "function(this: Foo, s: string) { return s; }")
    @TestCase("lambda", "foo.method")
    @TestCase("lambda", "foo.lambdaProp")
    @TestCase("lambda", "Foo.staticMethod")
    @TestCase("lambda", "Foo.staticLambdaProp")
    @TestCase("lambda", "function(this: Foo, s: string) { return s; }")
    @TestCase("foo.voidMethod", "foo.method")
    @TestCase("foo.voidMethod", "foo.lambdaProp")
    @TestCase("foo.voidMethod", "Foo.staticMethod")
    @TestCase("foo.voidMethod", "Foo.staticLambdaProp")
    @TestCase("foo.voidMethod", "function(this: Foo, s: string) { return s; }")
    @TestCase("foo.voidLambdaProp", "foo.method")
    @TestCase("foo.voidLambdaProp", "foo.lambdaProp")
    @TestCase("foo.voidLambdaProp", "Foo.staticMethod")
    @TestCase("foo.voidLambdaProp", "Foo.staticLambdaProp")
    @TestCase("foo.voidLambdaProp", "function(this: Foo, s: string) { return s; }")
    @TestCase("Foo.voidStaticMethod", "foo.method")
    @TestCase("Foo.voidStaticMethod", "foo.lambdaProp")
    @TestCase("Foo.voidStaticMethod", "Foo.staticMethod")
    @TestCase("Foo.voidStaticMethod", "Foo.staticLambdaProp")
    @TestCase("Foo.voidStaticMethod", "function(this: Foo, s: string) { return s; }")
    @TestCase("Foo.voidStaticLambdaProp", "foo.method")
    @TestCase("Foo.voidStaticLambdaProp", "foo.lambdaProp")
    @TestCase("Foo.voidStaticLambdaProp", "Foo.staticMethod")
    @TestCase("Foo.voidStaticLambdaProp", "Foo.staticLambdaProp")
    @TestCase("Foo.voidStaticLambdaProp", "function(this: Foo, s: string) { return s; }")
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
    @TestCase("Foo.staticMethod")
    @TestCase("Foo.staticLambdaProp")
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
    @TestCase("Foo.staticMethod")
    @TestCase("Foo.staticLambdaProp")
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
    @TestCase("foo.method", "Foo.voidStaticMethod")
    @TestCase("foo.method", "Foo.voidStaticLambdaProp")
    @TestCase("foo.method", "foo.voidMethod")
    @TestCase("foo.method", "foo.voidLambdaProp")
    @TestCase("foo.method", "function(this: void, s: string) { return s; }")
    @TestCase("foo.lambdaProp", "func")
    @TestCase("foo.lambdaProp", "lambda")
    @TestCase("foo.lambdaProp", "Foo.voidStaticMethod")
    @TestCase("foo.lambdaProp", "Foo.voidStaticLambdaProp")
    @TestCase("foo.lambdaProp", "foo.voidMethod")
    @TestCase("foo.lambdaProp", "foo.voidLambdaProp")
    @TestCase("foo.lambdaProp", "function(this: void, s: string) { return s; }")
    @TestCase("Foo.staticMethod", "func")
    @TestCase("Foo.staticMethod", "lambda")
    @TestCase("Foo.staticMethod", "Foo.voidStaticMethod")
    @TestCase("Foo.staticMethod", "Foo.voidStaticLambdaProp")
    @TestCase("Foo.staticMethod", "foo.voidMethod")
    @TestCase("Foo.staticMethod", "foo.voidLambdaProp")
    @TestCase("Foo.staticMethod", "function(this: void, s: string) { return s; }")
    @TestCase("Foo.staticLambdaProp", "func")
    @TestCase("Foo.staticLambdaProp", "lambda")
    @TestCase("Foo.staticLambdaProp", "Foo.voidStaticMethod")
    @TestCase("Foo.staticLambdaProp", "Foo.voidStaticLambdaProp")
    @TestCase("Foo.staticLambdaProp", "foo.voidMethod")
    @TestCase("Foo.staticLambdaProp", "foo.voidLambdaProp")
    @TestCase("Foo.staticLambdaProp", "function(this: void, s: string) { return s; }")
    @TestCase("thisFunc", "func")
    @TestCase("thisFunc", "lambda")
    @TestCase("thisFunc", "Foo.voidStaticMethod")
    @TestCase("thisFunc", "Foo.voidStaticLambdaProp")
    @TestCase("thisFunc", "foo.voidMethod")
    @TestCase("thisFunc", "foo.voidLambdaProp")
    @TestCase("thisFunc", "function(this: void, s: string) { return s; }")
    @TestCase("thisLambda", "func")
    @TestCase("thisLambda", "lambda")
    @TestCase("thisLambda", "Foo.voidStaticMethod")
    @TestCase("thisLambda", "Foo.voidStaticLambdaProp")
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
    @TestCase("Foo.voidStaticMethod")
    @TestCase("Foo.voidStaticLambdaProp")
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
    @TestCase("Foo.voidStaticMethod")
    @TestCase("Foo.voidStaticLambdaProp")
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

    @TestCase("s => s")
    @TestCase("(s => s)")
    @TestCase("function(s) { return s; }")
    @TestCase("(function(s) { return s; })")
    @Test("Function expression type inference in class")
    public functionExpressionTypeInferenceInClass(funcExp: string): void {
        const code =
            `class Foo {
                func: (this: void, s: string) => string = ${funcExp};
                method: (s: string) => string = ${funcExp};
                static staticFunc: (this: void, s: string) => string = ${funcExp};
                static staticMethod: (s: string) => string = ${funcExp};
            }
            const foo = new Foo();
            return foo.func("a") + foo.method("b") + Foo.staticFunc("c") + Foo.staticMethod("d");`;
        Expect(util.transpileAndExecute(code)).toBe("abcd");
    }

    @TestCase("const foo: Foo", "s => s")
    @TestCase("const foo: Foo", "(s => s)")
    @TestCase("const foo: Foo", "function(s) { return s; }")
    @TestCase("const foo: Foo", "(function(s) { return s; })")
    @TestCase("let foo: Foo; foo", "s => s")
    @TestCase("let foo: Foo; foo", "(s => s)")
    @TestCase("let foo: Foo; foo", "function(s) { return s; }")
    @TestCase("let foo: Foo; foo", "(function(s) { return s; })")
    @Test("Function expression type inference in object literal")
    public functionExpressionTypeInferenceInObjectLiteral(assignTo: string, funcExp: string): void {
        const code =
            `interface Foo {
                func(this: void, s: string): string;
                method(this: this, s: string): string;
            }
            ${assignTo} = {func: ${funcExp}, method: ${funcExp}};
            return foo.method("foo") + foo.func("bar");`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @TestCase("const foo: Foo", "s => s")
    @TestCase("const foo: Foo", "(s => s)")
    @TestCase("const foo: Foo", "function(s) { return s; }")
    @TestCase("const foo: Foo", "(function(s) { return s; })")
    @TestCase("let foo: Foo; foo", "s => s")
    @TestCase("let foo: Foo; foo", "(s => s)")
    @TestCase("let foo: Foo; foo", "function(s) { return s; }")
    @TestCase("let foo: Foo; foo", "(function(s) { return s; })")
    @Test("Function expression type inference in object literal (generic key)")
    public functionExpressionTypeInferenceInObjectLiteralGenericKey(assignTo: string, funcExp: string): void {
        const code =
            `interface Foo {
                [f: string]: (this: void, s: string) => string;
            }
            ${assignTo} = {func: ${funcExp}};
            return foo.func("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "s => s")
    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "(s => s)")
    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "function(s) { return s; }")
    @TestCase("const funcs: [Func, Method]", "funcs[0]", "funcs[1]", "(function(s) { return s; })")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "s => s")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "(s => s)")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "function(s) { return s; }")
    @TestCase("let funcs: [Func, Method]; funcs", "funcs[0]", "funcs[1]", "(function(s) { return s; })")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "s => s")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "(s => s)")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "function(s) { return s; }")
    @TestCase("const [func, meth]: [Func, Method]", "func", "meth", "(function(s) { return s; })")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "s => s")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "(s => s)")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "function(s) { return s; }")
    @TestCase("let func: Func; let meth: Method; [func, meth]", "func", "meth", "(function(s) { return s; })")
    @Test("Function expression type inference in tuple")
    public functionExpressionTypeInferenceInTuple(
        assignTo: string,
        func: string,
        method: string,
        funcExp: string
    ): void
    {
        const code =
            `interface Foo {
                method(s: string): string;
            }
            interface Func {
                (this: void, s: string): string;
            }
            interface Method {
                (this: Foo, s: string): string;
            }
            ${assignTo} = [${funcExp}, ${funcExp}];
            const foo: Foo = {method: ${method}};
            return foo.method("foo") + ${func}("bar");`;
        Expect(util.transpileAndExecute(code)).toBe("foobar");
    }

    @TestCase("const meths: Method[]", "meths[0]", "s => s")
    @TestCase("const meths: Method[]", "meths[0]", "(s => s)")
    @TestCase("const meths: Method[]", "meths[0]", "function(s) { return s; }")
    @TestCase("const meths: Method[]", "meths[0]", "(function(s) { return s; })")
    @TestCase("let meths: Method[]; meths", "meths[0]", "s => s")
    @TestCase("let meths: Method[]; meths", "meths[0]", "(s => s)")
    @TestCase("let meths: Method[]; meths", "meths[0]", "function(s) { return s; }")
    @TestCase("let meths: Method[]; meths", "meths[0]", "(function(s) { return s; })")
    @TestCase("const [meth]: Method[]", "meth", "s => s")
    @TestCase("const [meth]: Method[]", "meth", "(s => s)")
    @TestCase("const [meth]: Method[]", "meth", "function(s) { return s; }")
    @TestCase("const [meth]: Method[]", "meth", "(function(s) { return s; })")
    @TestCase("let meth: Method; [meth]", "meth", "s => s")
    @TestCase("let meth: Method; [meth]", "meth", "(s => s)")
    @TestCase("let meth: Method; [meth]", "meth", "function(s) { return s; }")
    @TestCase("let meth: Method; [meth]", "meth", "(function(s) { return s; })")
    @Test("Function expression type inference in array")
    public functionExpressionTypeInferenceInArray(assignTo: string, method: string, funcExp: string): void {
        const code =
            `interface Foo {
                method(s: string): string;
            }
            interface Method {
                (this: Foo, s: string): string;
            }
            ${assignTo} = [${funcExp}];
            const foo: Foo = {method: ${method}};
            return foo.method("foo");`;
        Expect(util.transpileAndExecute(code)).toBe("foo");
    }

    @Test("String table access")
    public stringTableAccess(assignType: string): void {
        const code = `const dict : {[key:string]:any} = {};
                      dict["a b"] = 3;
                      return dict["a b"];`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(3);
    }

}
