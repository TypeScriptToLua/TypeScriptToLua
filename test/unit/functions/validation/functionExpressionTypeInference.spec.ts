import * as util from "../../../util";

test.each(["noSelf", "noSelfInFile"])("noSelf function method argument (%p)", noSelfTag => {
    const header = `
        /** @${noSelfTag} */ namespace NS {
            export class C {
                method(fn: (s: string) => string) { return fn("foo"); }
            }
        }
        function foo(this: void, s: string) { return s; }
    `;
    const code = `
        const c = new NS.C();
        return c.method(foo);
    `;
    expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe("foo");
});

test("noSelfInFile works when first statement has other annotations", () => {
    util.testModule`
        /** @noSelfInFile */

        /** @internal */
        function foo() {}

        const test: (this: void) => void = foo;
    `.expectToHaveNoDiagnostics();
});

test.each(["(this: void, s: string) => string", "(this: any, s: string) => string", "(s: string) => string"])(
    "Function expression type inference in binary operator (%p)",
    funcType => {
        const header = `declare const undefinedFunc: ${funcType};`;
        const code = `
        let func: ${funcType} = s => s;
        func = undefinedFunc || (s => s);
        return func("foo");
    `;
        expect(util.transpileAndExecute(code, undefined, undefined, header)).toBe("foo");
    }
);

test.each(["s => s", "(s => s)", "function(s) { return s; }", "(function(s) { return s; })"])(
    "Function expression type inference in class (%p)",
    funcExp => {
        const code = `
            class Foo {
                func: (this: void, s: string) => string = ${funcExp};
                method: (s: string) => string = ${funcExp};
                static staticFunc: (this: void, s: string) => string = ${funcExp};
                static staticMethod: (s: string) => string = ${funcExp};
            }
            const foo = new Foo();
            return foo.func("a") + foo.method("b") + Foo.staticFunc("c") + Foo.staticMethod("d");
        `;
        expect(util.transpileAndExecute(code)).toBe("abcd");
    }
);

test.each([
    { assignTo: "const foo: Foo", funcExp: "s => s" },
    { assignTo: "const foo: Foo", funcExp: "(s => s)" },
    { assignTo: "const foo: Foo", funcExp: "function(s) { return s; }" },
    { assignTo: "const foo: Foo", funcExp: "(function(s) { return s; })" },
    { assignTo: "let foo: Foo; foo", funcExp: "s => s" },
    { assignTo: "let foo: Foo; foo", funcExp: "(s => s)" },
    { assignTo: "let foo: Foo; foo", funcExp: "function(s) { return s; }" },
    { assignTo: "let foo: Foo; foo", funcExp: "(function(s) { return s; })" },
])("Function expression type inference in object literal (%p)", ({ assignTo, funcExp }) => {
    const code = `
        interface Foo {
            func(this: void, s: string): string;
            method(this: this, s: string): string;
        }
        ${assignTo} = {func: ${funcExp}, method: ${funcExp}};
        return foo.method("foo") + foo.func("bar");
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test("Function expression type inference in object literal assigned to narrower type", () => {
    const code = `
        let foo: {} = {bar: s => s};
        return (foo as {bar: (a: any) => any}).bar("foobar");
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test.each([
    { assignTo: "const foo: Foo", funcExp: "s => s" },
    { assignTo: "const foo: Foo", funcExp: "(s => s)" },
    { assignTo: "const foo: Foo", funcExp: "function(s) { return s; }" },
    { assignTo: "const foo: Foo", funcExp: "(function(s) { return s; })" },
    { assignTo: "let foo: Foo; foo", funcExp: "s => s" },
    { assignTo: "let foo: Foo; foo", funcExp: "(s => s)" },
    { assignTo: "let foo: Foo; foo", funcExp: "function(s) { return s; }" },
    { assignTo: "let foo: Foo; foo", funcExp: "(function(s) { return s; })" },
])("Function expression type inference in object literal (generic key) (%p)", ({ assignTo, funcExp }) => {
    const code = `
            interface Foo {
                [f: string]: (this: void, s: string) => string;
            }
            ${assignTo} = {func: ${funcExp}};
            return foo.func("foo");
        `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "s => s",
    },
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(s => s)",
    },
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "const funcs: [Func, Method]",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(function(s) { return s; })",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "s => s",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(s => s)",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "let funcs: [Func, Method]; funcs",
        func: "funcs[0]",
        method: "funcs[1]",
        funcExp: "(function(s) { return s; })",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "s => s",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "(s => s)",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "const [func, meth]: [Func, Method]",
        func: "func",
        method: "meth",
        funcExp: "(function(s) { return s; })",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "s => s",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "(s => s)",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "function(s) { return s; }",
    },
    {
        assignTo: "let func: Func; let meth: Method; [func, meth]",
        func: "func",
        method: "meth",
        funcExp: "(function(s) { return s; })",
    },
])("Function expression type inference in tuple (%p)", ({ assignTo, func, method, funcExp }) => {
    const code = `
        interface Foo {
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
        return foo.method("foo") + ${func}("bar");
    `;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});

test.each([
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "s => s" },
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "(s => s)" },
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "function(s) { return s; }" },
    { assignTo: "const meths: Method[]", method: "meths[0]", funcExp: "(function(s) { return s; })" },
    { assignTo: "let meths: Method[]; meths", method: "meths[0]", funcExp: "s => s" },
    { assignTo: "let meths: Method[]; meths", method: "meths[0]", funcExp: "(s => s)" },
    { assignTo: "let meths: Method[]; meths", method: "meths[0]", funcExp: "function(s) { return s; }" },
    { assignTo: "let meths: Method[]; meths", method: "meths[0]", funcExp: "(function(s) { return s; })" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "s => s" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "(s => s)" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "function(s) { return s; }" },
    { assignTo: "const [meth]: Method[]", method: "meth", funcExp: "(function(s) { return s; })" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "s => s" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "(s => s)" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "function(s) { return s; }" },
    { assignTo: "let meth: Method; [meth]", method: "meth", funcExp: "(function(s) { return s; })" },
])("Function expression type inference in array (%p)", ({ assignTo, method, funcExp }) => {
    const code = `
        interface Foo {
            method(s: string): string;
        }
        interface Method {
            (this: Foo, s: string): string;
        }
        ${assignTo} = [${funcExp}];
        const foo: Foo = {method: ${method}};
        return foo.method("foo");
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in union (%p)", ({ funcType, funcExp }) => {
    const code = `
        type U = string | number | (${funcType});
        const u: U = ${funcExp};
        return (u as ${funcType})("foo");
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in union tuple (%p)", ({ funcType, funcExp }) => {
    const code = `
        interface I { callback: ${funcType}; }
        let a: I[] | number = [{ callback: ${funcExp} }];
        return a[0].callback("foo");
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in as cast (%p)", ({ funcType, funcExp }) => {
    const code = `
        const fn: ${funcType} = (${funcExp}) as (${funcType});
        return fn("foo");
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in type assertion (%p)", ({ funcType, funcExp }) => {
    const code = `
        const fn: ${funcType} = <${funcType}>(${funcExp});
        return fn("foo");
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});

test.each([
    { funcType: "(this: void, s: string) => string", funcExp: "s => s" },
    { funcType: "(this: any, s: string) => string", funcExp: "s => s" },
    { funcType: "(s: string) => string", funcExp: "s => s" },
    { funcType: "(this: void, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(this: any, s: string) => string", funcExp: "function(s) { return s; }" },
    { funcType: "(s: string) => string", funcExp: "function(s) { return s; }" },
])("Function expression type inference in constructor (%p)", ({ funcType, funcExp }) => {
    const code = `
        class C {
            result: string;
            constructor(fn: ${funcType}) { this.result = fn("foo"); }
        }
        const c = new C(${funcExp});
        return c.result;
    `;
    expect(util.transpileAndExecute(code)).toBe("foo");
});
