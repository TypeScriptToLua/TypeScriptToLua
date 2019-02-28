import { Expect, Test, TestCase } from "alsatian";

import * as ts from "typescript";
import * as util from "../src/util";

export class FunctionTests {

    @Test("Arrow Function Expression")
    public arrowFunctionExpression(): void
    {
        const result = util.transpileAndExecute(`let add = (a, b) => a+b; return add(1,2);`);

        // Assert
        Expect(result).toBe(3);
    }

    @TestCase("i++", 15)
    @TestCase("i--", 5)
    @TestCase("++i", 15)
    @TestCase("--i", 5)
    @Test("Arrow function unary expression")
    public arrowFunctionUnary(lambda: string, expected: number): void {
        const result = util.transpileAndExecute(`let i = 10; [1,2,3,4,5].forEach(() => ${lambda}); return i;`);

        Expect(result).toBe(expected);
    }

    @TestCase("b => a = b", 5)
    @TestCase("b => a += b", 15)
    @TestCase("b => a -= b", 5)
    @TestCase("b => a *= b", 50)
    @TestCase("b => a /= b", 2)
    @TestCase("b => a **= b", 100000)
    @TestCase("b => a %= b", 0)
    @Test("Arrow function assignment")
    public arrowFunctionAssignment(lambda: string, expected: number): void
    {
        const result = util.transpileAndExecute(`let a = 10; let lambda = ${lambda};
                                          lambda(5); return a;`);

        // Assert
        Expect(result).toBe(expected);
    }

    @TestCase([])
    @TestCase([5])
    @TestCase([1, 2])
    @Test("Arrow Default Values")
    public arrowExpressionDefaultValues(inp: number[]): void {
        // Default value is 3 for v1
        const v1 = inp.length > 0 ? inp[0] : 3;
        // Default value is 4 for v2
        const v2 = inp.length > 1 ? inp[1] : 4;

        const callArgs = inp.join(",");

        // Transpile/Execute
        const result = util.transpileAndExecute(
            `let add = (a: number = 3, b: number = 4) => a+b;
            return add(${callArgs});`
        );

        // Assert
        Expect(result).toBe(v1 + v2);
    }

    @Test("Function Expression")
    public functionExpression(): void
    {
        const result = util.transpileAndExecute(`let add = function(a, b) {return a+b}; return add(1,2);`);

        // Assert
        Expect(result).toBe(3);
    }

    @Test("Function definition scope")
    public functionDefinitionScope(): void
    {
        const result = util.transpileAndExecute(`function abc() { function xyz() { return 5; } }\n
            function def() { function xyz() { return 3; } abc(); return xyz(); }\n
            return def();`);

        // Assert
        Expect(result).toBe(3);
    }

    @Test("Function default parameter")
    public functionDefaultParameter(): void
    {
        const result = util.transpileAndExecute(`function abc(defaultParam: string = "abc") { return defaultParam; }\n
            return abc() + abc("def");`);

        // Assert
        Expect(result).toBe("abcdef");
    }

    @TestCase([])
    @TestCase([5])
    @TestCase([1, 2])
    @Test("Function Default Values")
    public functionExpressionDefaultValues(inp: number[]): void {
        // Default value is 3 for v1
        const v1 = inp.length > 0 ? inp[0] : 3;
        // Default value is 4 for v2
        const v2 = inp.length > 1 ? inp[1] : 4;

        const callArgs = inp.join(",");

        // Transpile/Execute
        const result = util.transpileAndExecute(
            `let add = function(a: number = 3, b: number = 4) { return a+b; };
            return add(${callArgs});`
        );

        // Assert
        Expect(result).toBe(v1 + v2);
    }

    @Test("Class method call")
    public classMethod(): void {
        const returnValue = 4;
        const source = `class TestClass {
                            public classMethod(): number { return ${returnValue}; }
                        }

                        const classInstance = new TestClass();
                        return classInstance.classMethod();`;

        // Transpile/Execute
        const result = util.transpileAndExecute(source);

        // Assert
        Expect(result).toBe(returnValue);
    }

    @Test("Class dot method call void")
    public classDotMethod(): void {
        const returnValue = 4;
        const source = `class TestClass {
                            public dotMethod: () => number = () => ${returnValue};
                        }

                        const classInstance = new TestClass();
                        return classInstance.dotMethod();`;

        // Transpile/Execute
        const result = util.transpileAndExecute(source);

        // Assert
        Expect(result).toBe(returnValue);
    }

    @Test("Class dot method call with parameter")
    public classDotMethod2(): void {
        const returnValue = 4;
        const source = `class TestClass {
                            public dotMethod: (x: number) => number = x => 3 * x;
                        }

                        const classInstance = new TestClass();
                        return classInstance.dotMethod(${returnValue});`;

        // Transpile
        const result = util.transpileAndExecute(source);

        // Assert
        Expect(result).toBe(3 * returnValue);
    }

    @Test("Class static dot method")
    public classDotMethodStatic(): void {
        const returnValue = 4;
        const source = `class TestClass {
                            public static dotMethod: () => number = () => ${returnValue};
                        }

                        return TestClass.dotMethod();`;

        // Transpile/Execute
        const result = util.transpileAndExecute(source);

        // Assert
        Expect(result).toBe(returnValue);
    }

    @Test("Class static dot method with parameter")
    public classDotMethodStaticWithParameter(): void {
        const returnValue = 4;
        const source = `class TestClass {
                            public static dotMethod: (x: number) => number = x => 3 * x;
                        }

                        return TestClass.dotMethod(${returnValue});`;

        // Transpile
        const result = util.transpileAndExecute(source);

        // Assert
        Expect(result).toBe(3 * returnValue);
    }

    @Test("Function bind")
    public functionBind(): void {
        const source = `const abc = function (this: { a: number }, a: string, b: string) { return this.a + a + b; }
                        return abc.bind({ a: 4 }, "b")("c");`;

        const result = util.transpileAndExecute(source);

        Expect(result).toBe("4bc");
    }

    @Test("Function apply")
    public functionApply(): void {
        const source = `const abc = function (this: { a: number }, a: string) { return this.a + a; }
                        return abc.apply({ a: 4 }, ["b"]);`;

        const result = util.transpileAndExecute(source);

        Expect(result).toBe("4b");
    }

    @Test("Function call")
    public functionCall(): void {
        const source = `const abc = function (this: { a: number }, a: string) { return this.a + a; }
                        return abc.call({ a: 4 }, "b");`;

        const result = util.transpileAndExecute(source);

        Expect(result).toBe("4b");
    }

    @Test("Invalid property access call transpilation")
    public invalidPropertyCall(): void {
        const transformer = util.makeTestTransformer();

        const mockObject: any = {
            expression: ts.createLiteral("abc"),
        };

        Expect(() => transformer.transformPropertyCall(mockObject as ts.CallExpression))
            .toThrowError(Error, "Tried to transpile a non-property call as property call.");
    }

    @Test("Function dead code after return")
    public functionDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `function abc() { return 3; const a = 5; } return abc();`);

        Expect(result).toBe(3);
    }

    @Test("Method dead code after return")
    public methodDeadCodeAfterReturn(): void {
        const result = util.transpileAndExecute(
            `class def { public static abc() { return 3; const a = 5; } } return def.abc();`);

        Expect(result).toBe(3);
    }

    @Test("Recursive function definition")
    public recursiveFunctionDefinition(): void {
        const result = util.transpileAndExecute(
            `function f() { return typeof f; }; return f();`);

        Expect(result).toBe("function");
    }

    @Test("Recursive function expression")
    public recursiveFunctionExpression(): void {
        const result = util.transpileAndExecute(
            `let f = function() { return typeof f; }; return f();`);

        Expect(result).toBe("function");
    }

    @Test("Wrapped recursive function expression")
    public wrappedRecursiveFunctionExpression(): void {
        const result = util.transpileAndExecute(
            `function wrap<T>(fn: T) { return fn; }
            let f = wrap(function() { return typeof f; }); return f();`);

        Expect(result).toBe("function");
    }

    @Test("Recursive arrow function")
    public recursiveArrowFunction(): void {
        const result = util.transpileAndExecute(
            `let f = () => typeof f; return f();`);

        Expect(result).toBe("function");
    }

    @Test("Wrapped recursive arrow function")
    public wrappedRecursiveArrowFunction(): void {
        const result = util.transpileAndExecute(
            `function wrap<T>(fn: T) { return fn; }
            let f = wrap(() => typeof f); return f();`);

        Expect(result).toBe("function");
    }

    @Test("Object method declaration")
    public objectMethodDeclaration(): void {
        const result = util.transpileAndExecute(
            `let o = { v: 4, m(i: number): number { return this.v * i; } }; return o.m(3);`);
        Expect(result).toBe(12);
    }

    @TestCase(["bar"], "foobar")
    @TestCase(["baz", "bar"], "bazbar")
    @Test("Function overload")
    public functionOverload(args: string[], expectResult: string): void {
        const code = `class O {
                          prop = "foo";
                          method(s: string): string;
                          method(this: void, s1: string, s2: string): string;
                          method(s1: string) {
                              if (typeof this === "string") {
                                  return this + s1;
                              }
                              return this.prop + s1;
                          }
                      };
                      const o = new O();
                      return o.method(${args.map(a => "\"" + a + "\"").join(", ")});`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @Test("Nested Function")
    public nestedFunction(): void {
        const code = `class C {
                          private prop = "bar";
                          public outer() {
                              const o = {
                                  prop: "foo",
                                  innerFunc: function() { return this.prop; },
                                  innerArrow: () => this.prop
                              };
                              return o.innerFunc() + o.innerArrow();
                          }
                      }
                      let c = new C();
                      return c.outer();`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foobar");
    }

    @TestCase("abc", "abc")
    @TestCase("abc", "def")
    @Test("Dot vs Colon method call")
    public dotVColonMethodCall(s1: string, s2: string): void
    {
        const result = util.transpileAndExecute(
            `class MyClass {
                dotMethod(this: void, s: string) {
                    return s;
                }
                colonMethod(s: string) {
                    return s;
                }
            }
            const inst = new MyClass();
            return inst.dotMethod("${s1}") == inst.colonMethod("${s2}");`
        );
        Expect(result).toBe(s1 === s2);
    }

    @Test("Element access call")
    public elementAccessCall(): void {
        const code = `class C {
            prop = "bar";
            method(s: string) { return s + this.prop; }
        }
        const c = new C();
        return c['method']("foo");
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foobar");
    }

    @Test("Element access call no args")
    public elementAccessCallNoArgs(): void {
        const code = `class C {
            prop = "bar";
            method() { return this.prop; }
        }
        const c = new C();
        return c['method']();
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("bar");
    }

    @Test("Complex element access call")
    public elementAccessCallComplex(): void {
        const code = `class C {
            prop = "bar";
            method(s: string) { return s + this.prop; }
        }
        function getC() { return new C(); }
        return getC()['method']("foo");
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foobar");
    }

    @Test("Complex element access call no args")
    public elementAccessCallComplexNoArgs(): void {
        const code = `class C {
            prop = "bar";
            method() { return this.prop; }
        }
        function getC() { return new C(); }
        return getC()['method']();
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("bar");
    }

    @Test("Complex element access call statement")
    public elementAccessCallComplexStatement(): void {
        const code = `let foo: string;
        class C {
            prop = "bar";
            method(s: string) { foo = s + this.prop; }
        }
        function getC() { return new C(); }
        getC()['method']("foo");
        return foo;
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foobar");
    }

    @TestCase(1, 1)
    @TestCase(2, 42)
    @Test("Generator functions value")
    public generatorFunctionValue(iterations: number, expectedResult: number): void {
        const code = `function* seq(value: number) {
            let a = yield value + 1;
            return 42;
        }
        const gen = seq(0);
        let ret: number;
        for(let i = 0; i < ${iterations}; ++i)
        {
            ret = gen.next(i).value;
        }
        return ret;
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectedResult);
    }

    @TestCase(1, false)
    @TestCase(2, true)
    @Test("Generator functions done")
    public generatorFunctionDone(iterations: number, expectedResult: boolean): void {
        const code = `function* seq(value: number) {
            let a = yield value + 1;
            return 42;
        }
        const gen = seq(0);
        let ret: boolean;
        for(let i = 0; i < ${iterations}; ++i)
        {
            ret = gen.next(i).done;
        }
        return ret;
        `;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectedResult);
    }

    @Test("Generator for..of")
    public generatorFunctionForOf(): void {
        const code = `function* seq() {
            yield(1);
            yield(2);
            yield(3);
            return 4;
        }
        let result = 0;
        for(let i of seq())
        {
            result = result * 10 + i;
        }
        return result`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(123);
    }

    @Test("Function local overriding export")
    public functionLocalOverridingExport(): void {
        const code =
            `export const foo = 5;
            function bar(foo: number) {
                return foo;
            }
            export const result = bar(7);`;
        Expect(util.transpileExecuteAndReturnExport(code, "result")).toBe(7);
    }

    @Test("Function using global as this")
    public functionUsingGlobalAsThis(): void {
        const code =
            `var foo = "foo";
            function bar(this: any) {
                return this.foo;
            }`;
        Expect(util.transpileAndExecute("return foo;", undefined, undefined, code)).toBe("foo");
    }
}
