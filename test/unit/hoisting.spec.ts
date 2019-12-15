import * as ts from "typescript";
import { ReferencedBeforeDeclaration } from "../../src/transformation/utils/errors";
import * as util from "../util";

test.each(["let", "const"])("Let/Const Hoisting (%p)", varType => {
    const code = `
        let bar: string;
        function setBar() { bar = foo; }
        ${varType} foo = "foo";
        setBar();
        return foo;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

test.each(["let", "const"])("Exported Let/Const Hoisting (%p)", varType => {
    const code = `
        let bar: string;
        function setBar() { bar = foo; }
        export ${varType} foo = "foo";
        setBar();
    `;
    const result = util.transpileExecuteAndReturnExport(code, "foo");
    expect(result).toBe("foo");
});

test("Global Function Hoisting", () => {
    const code = `
        const foo = bar();
        function bar() { return "bar"; }
        return foo;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("bar");
});

test("Local Function Hoisting", () => {
    const code = `
        export const foo = bar();
        function bar() { return "bar"; }
    `;
    const result = util.transpileExecuteAndReturnExport(code, "foo");
    expect(result).toBe("bar");
});

test("Exported Function Hoisting", () => {
    const code = `
        const foo = bar();
        export function bar() { return "bar"; }
        export const baz = foo;
    `;
    const result = util.transpileExecuteAndReturnExport(code, "baz");
    expect(result).toBe("bar");
});

test("Namespace Function Hoisting", () => {
    const code = `
        let foo: string;
        namespace NS {
            foo = bar();
            function bar() { return "bar"; }
        }
    `;
    const result = util.transpileAndExecute("return foo;", undefined, undefined, code);
    expect(result).toBe("bar");
});

test("Exported Namespace Function Hoisting", () => {
    const code = `
        let foo: string;
        namespace NS {
            foo = bar();
            export function bar() { return "bar"; }
        }
    `;
    const result = util.transpileAndExecute("return foo;", undefined, undefined, code);
    expect(result).toBe("bar");
});

test.each([
    { varType: "let", expectResult: "bar" },
    { varType: "const", expectResult: "bar" },
])("Hoisting in Non-Function Scope (%p)", ({ varType, expectResult }) => {
    const code = `
            function foo() {
                ${varType} bar = "bar";
                for (let i = 0; i < 1; ++i) {
                    ${varType} bar = "foo";
                }
                return bar;
            }
            return foo();
        `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe(expectResult);
});

test("Hoisting due to reference from hoisted function", () => {
    const code = `
        const foo = "foo";
        const result = bar();
        function bar() {
            return foo;
        }
        return result;
    `;
    const result = util.transpileAndExecute(code);
    expect(result).toBe("foo");
});

test("Namespace Hoisting", () => {
    const code = `
        function bar() {
            return NS.foo;
        }
        namespace NS {
            export let foo = "foo";
        }
        export const foo = bar();
    `;
    const result = util.transpileExecuteAndReturnExport(code, "foo");
    expect(result).toBe("foo");
});

test("Exported Namespace Hoisting", () => {
    const code = `
        function bar() {
            return NS.foo;
        }
        export namespace NS {
            export let foo = "foo";
        }
        export const foo = bar();
    `;
    const result = util.transpileExecuteAndReturnExport(code, "foo");
    expect(result).toBe("foo");
});

test("Nested Namespace Hoisting", () => {
    util.testModule`
        const Inner = 0;
        namespace Outer {
            export function bar() {
                return Inner.foo;
            }
            namespace Inner {
                export const foo = "foo";
            }
        }

        export const foo = Outer.bar();
        export { Inner };
    `.expectToMatchJsResult();
});

test("Class Hoisting", () => {
    const code = `
        function makeFoo() {
            return new Foo();
        }
        class Foo {
            public bar = "foo";
        }
        export const foo = makeFoo().bar;
    `;
    const result = util.transpileExecuteAndReturnExport(code, "foo");
    expect(result).toBe("foo");
});

test("Enum Hoisting", () => {
    const code = `
        function bar() {
            return E.A;
        }
        enum E {
            A = "foo"
        }
        export const foo = bar();
    `;
    const result = util.transpileExecuteAndReturnExport(code, "foo");
    expect(result).toBe("foo");
});

test.each([
    { code: `foo = "foo"; var foo;`, identifier: "foo" },
    { code: `foo = "foo"; export var foo;`, identifier: "foo" },
    { code: `function setBar() { const bar = foo; } let foo = "foo";`, identifier: "foo" },
    { code: `function setBar() { const bar = foo; } const foo = "foo";`, identifier: "foo" },
    { code: `function setBar() { const bar = foo; } export let foo = "foo";`, identifier: "foo" },
    { code: `function setBar() { const bar = foo; } export const foo = "foo";`, identifier: "foo" },
    { code: `const foo = bar(); function bar() { return "bar"; }`, identifier: "bar" },
    { code: `export const foo = bar(); function bar() { return "bar"; }`, identifier: "bar" },
    { code: `const foo = bar(); export function bar() { return "bar"; }`, identifier: "bar" },
    { code: `function bar() { return NS.foo; } namespace NS { export let foo = "foo"; }`, identifier: "NS" },
    {
        code: `export namespace O { export function f() { return I.foo; } namespace I { export let foo = "foo"; } }`,
        identifier: "I",
    },
    { code: `function makeFoo() { return new Foo(); } class Foo {}`, identifier: "Foo" },
    { code: `function bar() { return E.A; } enum E { A = "foo" }`, identifier: "E" },
    { code: `function setBar() { const bar = { foo }; } let foo = "foo";`, identifier: "foo" },
])("No Hoisting (%p)", ({ code, identifier }) => {
    expect(() => util.transpileString(code, { noHoisting: true })).toThrowExactError(
        ReferencedBeforeDeclaration(ts.createIdentifier(identifier))
    );
});

test("Import hoisting (named)", () => {
    const importCode = `
        const bar = foo;
        import {foo} from "myMod";`;
    const luaHeader = `
        package.loaded["myMod"] = {foo = "foobar"}
        ${util.transpileString(importCode)}`;
    const tsHeader = "declare const bar: any;";
    const code = "return bar;";
    expect(util.transpileAndExecute(code, undefined, luaHeader, tsHeader)).toBe("foobar");
});

test("Import hoisting (namespace)", () => {
    const importCode = `
        const bar = myMod.foo;
        import * as myMod from "myMod";`;
    const luaHeader = `
        package.loaded["myMod"] = {foo = "foobar"}
        ${util.transpileString(importCode)}`;
    const tsHeader = "declare const bar: any;";
    const code = "return bar;";
    expect(util.transpileAndExecute(code, undefined, luaHeader, tsHeader)).toBe("foobar");
});

test("Import hoisting (side-effect)", () => {
    const importCode = `
        const bar = foo;
        import "myMod";`;
    const luaHeader = `
        package.loaded["myMod"] = {_ = (function() foo = "foobar" end)()}
        ${util.transpileString(importCode)}`;
    const tsHeader = "declare const bar: any;";
    const code = "return bar;";
    expect(util.transpileAndExecute(code, undefined, luaHeader, tsHeader)).toBe("foobar");
});

test("Import hoisted before function", () => {
    const importCode = `
        let bar: any;
        import {foo} from "myMod";
        baz();
        function baz() {
            bar = foo;
        }`;
    const luaHeader = `
        package.loaded["myMod"] = {foo = "foobar"}
        ${util.transpileString(importCode)}`;
    const tsHeader = "declare const bar: any;";
    const code = "return bar;";
    expect(util.transpileAndExecute(code, undefined, luaHeader, tsHeader)).toBe("foobar");
});

test("Hoisting Shorthand Property", () => {
    const code = `
        function foo() {
            return { bar }.bar;
        }
        let bar = "foobar";
        return foo();`;
    expect(util.transpileAndExecute(code)).toBe("foobar");
});
