import * as ts from "typescript";
import * as TSTLErrors from "../../src/TSTLErrors";
import * as util from "../util";

test("Arrow Function Expression", () => {
    const result = util.transpileAndExecute(`let add = (a, b) => a+b; return add(1,2);`);

    expect(result).toBe(3);
});

test.each([
    { lambda: "i++", expected: 15 },
    { lambda: "i--", expected: 5 },
    { lambda: "++i", expected: 15 },
    { lambda: "--i", expected: 5 },
])("Arrow function unary expression (%p)", ({ lambda, expected }) => {
    const result = util.transpileAndExecute(`let i = 10; [1,2,3,4,5].forEach(() => ${lambda}); return i;`);

    expect(result).toBe(expected);
});

test.each([
    { lambda: "b => a = b", expected: 5 },
    { lambda: "b => a += b", expected: 15 },
    { lambda: "b => a -= b", expected: 5 },
    { lambda: "b => a *= b", expected: 50 },
    { lambda: "b => a /= b", expected: 2 },
    { lambda: "b => a **= b", expected: 100000 },
    { lambda: "b => a %= b", expected: 0 },
])("Arrow function assignment (%p)", ({ lambda, expected }) => {
    const result = util.transpileAndExecute(`let a = 10; let lambda = ${lambda};
                                      lambda(5); return a;`);

    expect(result).toBe(expected);
});

test.each([{ inp: [] }, { inp: [5] }, { inp: [1, 2] }])("Arrow Default Values (%p)", ({ inp }) => {
    // Default value is 3 for v1
    const v1 = inp.length > 0 ? inp[0] : 3;
    // Default value is 4 for v2
    const v2 = inp.length > 1 ? inp[1] : 4;

    const callArgs = inp.join(",");

    const result = util.transpileAndExecute(
        `let add = (a: number = 3, b: number = 4) => a+b;
        return add(${callArgs});`
    );

    expect(result).toBe(v1 + v2);
});

test("Function Expression", () => {
    const result = util.transpileAndExecute(`let add = function(a, b) {return a+b}; return add(1,2);`);

    expect(result).toBe(3);
});

test("Function definition scope", () => {
    const result = util.transpileAndExecute(`function abc() { function xyz() { return 5; } }\n
        function def() { function xyz() { return 3; } abc(); return xyz(); }\n
        return def();`);

    expect(result).toBe(3);
});

test("Function default parameter", () => {
    const result = util.transpileAndExecute(`function abc(defaultParam: string = "abc") { return defaultParam; }\n
        return abc() + abc("def");`);

    expect(result).toBe("abcdef");
});

test.each([{ inp: [] }, { inp: [5] }, { inp: [1, 2] }])("Function Default Values (%p)", ({ inp }) => {
    // Default value is 3 for v1
    const v1 = inp.length > 0 ? inp[0] : 3;
    // Default value is 4 for v2
    const v2 = inp.length > 1 ? inp[1] : 4;

    const callArgs = inp.join(",");

    const result = util.transpileAndExecute(
        `let add = function(a: number = 3, b: number = 4) { return a+b; };
        return add(${callArgs});`
    );

    expect(result).toBe(v1 + v2);
});

test("Function default array binding parameter", () => {
    const code = `
        function foo([bar]: [string] = ["foobar"]) {
            return bar;
        }
        return foo();`;

    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Function default object binding parameter", () => {
    const code = `
        function foo({ bar }: { bar: string } = { bar: "foobar" }) {
            return bar;
        }
        return foo();`;

    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Function default binding parameter maintains order", () => {
    const code = `
        const resultsA = [{x: "foo"}, {x: "baz"}];
        const resultsB = ["blah", "bar"];
        let i = 0;
        function a() { return resultsA[i++]; }
        function b() { return resultsB[i++]; }
        function foo({ x }: { x: string } = a(), y = b()) {
            return x + y;
        }
        return foo();`;

    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Class method call", () => {
    const returnValue = 4;
    const source = `class TestClass {
                        public classMethod(): number { return ${returnValue}; }
                    }

                    const classInstance = new TestClass();
                    return classInstance.classMethod();`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(returnValue);
});

test("Class dot method call void", () => {
    const returnValue = 4;
    const source = `class TestClass {
                        public dotMethod: () => number = () => ${returnValue};
                    }

                    const classInstance = new TestClass();
                    return classInstance.dotMethod();`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(returnValue);
});

test("Class dot method call with parameter", () => {
    const returnValue = 4;
    const source = `class TestClass {
                        public dotMethod: (x: number) => number = x => 3 * x;
                    }

                    const classInstance = new TestClass();
                    return classInstance.dotMethod(${returnValue});`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(3 * returnValue);
});

test("Class static dot method", () => {
    const returnValue = 4;
    const source = `class TestClass {
                        public static dotMethod: () => number = () => ${returnValue};
                    }

                    return TestClass.dotMethod();`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(returnValue);
});

test("Class static dot method with parameter", () => {
    const returnValue = 4;
    const source = `class TestClass {
                        public static dotMethod: (x: number) => number = x => 3 * x;
                    }

                    return TestClass.dotMethod(${returnValue});`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe(3 * returnValue);
});

test("Function bind", () => {
    const source = `const abc = function (this: { a: number }, a: string, b: string) { return this.a + a + b; }
                    return abc.bind({ a: 4 }, "b")("c");`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe("4bc");
});

test("Function apply", () => {
    const source = `const abc = function (this: { a: number }, a: string) { return this.a + a; }
                    return abc.apply({ a: 4 }, ["b"]);`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe("4b");
});

test("Function call", () => {
    const source = `const abc = function (this: { a: number }, a: string) { return this.a + a; }
                    return abc.call({ a: 4 }, "b");`;

    const result = util.transpileAndExecute(source);

    expect(result).toBe("4b");
});

test("Invalid property access call transpilation", () => {
    const transformer = util.makeTestTransformer();

    const mockObject: any = {
        expression: ts.createLiteral("abc"),
    };

    expect(() => transformer.transformPropertyCall(mockObject as ts.CallExpression)).toThrowExactError(
        TSTLErrors.InvalidPropertyCall(util.nodeStub)
    );
});

test("Function dead code after return", () => {
    const result = util.transpileAndExecute(`function abc() { return 3; const a = 5; } return abc();`);

    expect(result).toBe(3);
});

test("Method dead code after return", () => {
    const result = util.transpileAndExecute(
        `class def { public static abc() { return 3; const a = 5; } } return def.abc();`
    );

    expect(result).toBe(3);
});

test("Recursive function definition", () => {
    const result = util.transpileAndExecute(`function f() { return typeof f; }; return f();`);

    expect(result).toBe("function");
});

test("Recursive function expression", () => {
    const result = util.transpileAndExecute(`let f = function() { return typeof f; }; return f();`);

    expect(result).toBe("function");
});

test("Wrapped recursive function expression", () => {
    const result = util.transpileAndExecute(
        `function wrap<T>(fn: T) { return fn; }
        let f = wrap(function() { return typeof f; }); return f();`
    );

    expect(result).toBe("function");
});

test("Recursive arrow function", () => {
    const result = util.transpileAndExecute(`let f = () => typeof f; return f();`);

    expect(result).toBe("function");
});

test("Wrapped recursive arrow function", () => {
    const result = util.transpileAndExecute(
        `function wrap<T>(fn: T) { return fn; }
        let f = wrap(() => typeof f); return f();`
    );

    expect(result).toBe("function");
});

test("Object method declaration", () => {
    const result = util.transpileAndExecute(
        `let o = { v: 4, m(i: number): number { return this.v * i; } }; return o.m(3);`
    );
    expect(result).toBe(12);
});

test.each([{ args: ["bar"], expectResult: "foobar" }, { args: ["baz", "bar"], expectResult: "bazbar" }])(
    "Function overload (%p)",
    ({ args, expectResult }) => {
        const code = `
        class O {
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
        return o.method(${args.map(a => '"' + a + '"').join(", ")});
    `;
        const result = util.transpileAndExecute(code);
        expect(result).toBe(expectResult);
    }
);

test("Nested Function", () => {
    const code = `
        class C {
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
        return c.outer();
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foobar");
});

test.each([{ s1: "abc", s2: "abc" }, { s1: "abc", s2: "def" }])("Dot vs Colon method call (%p)", ({ s1, s2 }) => {
    const result = util.transpileAndExecute(`
            class MyClass {
                dotMethod(this: void, s: string) {
                    return s;
                }
                colonMethod(s: string) {
                    return s;
                }
            }
            const inst = new MyClass();
            return inst.dotMethod("${s1}") == inst.colonMethod("${s2}");
        `);
    expect(result).toBe(s1 === s2);
});

test("Element access call", () => {
    const code = `
        class C {
            prop = "bar";
            method(s: string) { return s + this.prop; }
        }
        const c = new C();
        return c['method']("foo");
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foobar");
});

test("Element access call no args", () => {
    const code = `
    class C {
            prop = "bar";
            method() { return this.prop; }
        }
        const c = new C();
        return c['method']();
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("bar");
});

test("Complex element access call", () => {
    const code = `
        class C {
            prop = "bar";
            method(s: string) { return s + this.prop; }
        }
        function getC() { return new C(); }
        return getC()['method']("foo");
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foobar");
});

test("Complex element access call no args", () => {
    const code = `
        class C {
            prop = "bar";
            method() { return this.prop; }
        }
        function getC() { return new C(); }
        return getC()['method']();
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("bar");
});

test("Complex element access call statement", () => {
    const code = `
        let foo: string;
        class C {
            prop = "bar";
            method(s: string) { foo = s + this.prop; }
        }
        function getC() { return new C(); }
        getC()['method']("foo");
        return foo;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foobar");
});

test.each([{ iterations: 1, expectedResult: 1 }, { iterations: 2, expectedResult: 42 }])(
    "Generator functions value (%p)",
    ({ iterations, expectedResult }) => {
        const code = `
            function* seq(value: number) {
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
        expect(result).toBe(expectedResult);
    }
);

test.each([{ iterations: 1, expectedResult: false }, { iterations: 2, expectedResult: true }])(
    "Generator functions done (%p)",
    ({ iterations, expectedResult }) => {
        const code = `
            function* seq(value: number) {
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
        expect(result).toBe(expectedResult);
    }
);

test("Generator for..of", () => {
    const code = `
        function* seq() {
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
        return result
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(123);
});

test("Function local overriding export", () => {
    const code = `
        export const foo = 5;
        function bar(foo: number) {
            return foo;
        }
        export const result = bar(7);
    `;
    expect(util.transpileExecuteAndReturnExport(code, "result")).toBe(7);
});

test("Function using global as this", () => {
    const code = `
        var foo = "foo";
        function bar(this: any) {
            return this.foo;
        }
    `;
    expect(util.transpileAndExecute("return foo;", undefined, undefined, code)).toBe("foo");
});

test("Function rest binding pattern", () => {
    const result = util.transpileAndExecute(`
        function bar(foo: string, ...[bar, baz]: [string, string]) {
            return bar + baz + foo;
        }
        return bar("abc", "def", "xyz");
    `);

    expect(result).toBe("defxyzabc");
});

test.each([{}, { noHoisting: true }])("Function rest parameter", compilerOptions => {
    const code = `
        function foo(a: unknown, ...b: string[]) {
            return b.join("");
        }
        return foo("A", "B", "C", "D");
    `;

    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCD");
});

test.each([{}, { noHoisting: true }])("Function nested rest parameter", compilerOptions => {
    const code = `
        function foo(a: unknown, ...b: string[]) {
            function bar() {
                return b.join("");
            }
            return bar();
        }
        return foo("A", "B", "C", "D");
    `;

    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCD");
});

test.each([{}, { noHoisting: true }])("Function nested rest spread", compilerOptions => {
    const code = `
        function foo(a: unknown, ...b: string[]) {
            function bar() {
                const c = [...b];
                return c.join("");
            }
            return bar();
        }
        return foo("A", "B", "C", "D");
    `;

    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCD");
});

test.each([{}, { noHoisting: true }])("Function rest parameter (unreferenced)", compilerOptions => {
    const code = `
        function foo(a: unknown, ...b: string[]) {
            return "foobar";
        }
        return foo("A", "B", "C", "D");
    `;

    expect(util.transpileString(code, compilerOptions)).not.toMatch("b = ({...})");
    expect(util.transpileAndExecute(code, compilerOptions)).toBe("foobar");
});

test.each([{}, { noHoisting: true }])("@vararg", compilerOptions => {
    const code = `
        /** @vararg */ type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        function foo(a: unknown, ...b: LuaVarArg<unknown[]>) {
            const c = [...b];
            return c.join("");
        }
        function bar(a: unknown, ...b: LuaVarArg<unknown[]>) {
            return foo(a, ...b);
        }
        return bar("A", "B", "C", "D");
    `;

    const lua = util.transpileString(code, compilerOptions);
    expect(lua).not.toMatch("b = ({...})");
    expect(lua).not.toMatch("unpack");
    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCD");
});

test.each([{}, { noHoisting: true }])("@vararg array access", compilerOptions => {
    const code = `
        /** @vararg */ type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        function foo(a: unknown, ...b: LuaVarArg<unknown[]>) {
            const c = [...b];
            return c.join("") + b[0];
        }
        return foo("A", "B", "C", "D");
    `;

    expect(util.transpileAndExecute(code, compilerOptions)).toBe("BCDB");
});

test.each([{}, { noHoisting: true }])("@vararg global", compilerOptions => {
    const code = `
        /** @vararg */ type LuaVarArg<A extends unknown[]> = A & { __luaVarArg?: never };
        declare const arg: LuaVarArg<string[]>;
        const arr = [...arg];
        const result = arr.join("");
    `;

    const luaBody = util.transpileString(code, compilerOptions, false);
    expect(luaBody).not.toMatch("unpack");

    const lua = `
        function test(...)
            ${luaBody}
            return result
        end
        return test("A", "B", "C", "D")
    `;

    expect(util.executeLua(lua)).toBe("ABCD");
});

test("named function expression reference", () => {
    const code = `
        const y = function x(inp: string) {
            return inp + typeof x;
        };
        return y("foo-");`;
    expect(util.transpileAndExecute(code)).toBe("foo-function");
});
