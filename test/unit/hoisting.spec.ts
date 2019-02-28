import * as ts from "typescript";
import { Expect, Test, TestCase } from "alsatian";

import * as util from "../src/util";
import { CompilerOptions, LuaLibImportKind, LuaTarget } from "../../src/CompilerOptions";
import { TranspileError } from "../../src/TranspileError";

export class HoistingTests {
    @Test("Var Hoisting")
    public varHoisting(): void {
        const code =
            `foo = "foo";
            var foo;
            return foo;`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Exported Var Hoisting")
    public exportedVarHoisting(): void {
        const code =
            `foo = "foo";
            export var foo;`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @TestCase("let")
    @TestCase("const")
    @Test("Let/Const Hoisting")
    public letConstHoisting(varType: string): void {
        const code =
            `let bar: string;
            function setBar() { bar = foo; }
            ${varType} foo = "foo";
            setBar();
            return foo;`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @TestCase("let")
    @TestCase("const")
    @Test("Exported Let/Const Hoisting")
    public exportedLetConstHoisting(varType: string): void {
        const code =
            `let bar: string;
            function setBar() { bar = foo; }
            export ${varType} foo = "foo";
            setBar();`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @Test("Global Function Hoisting")
    public globalFunctionHoisting(): void {
        const code =
            `const foo = bar();
            function bar() { return "bar"; }
            return foo;`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("bar");
    }

    @Test("Local Function Hoisting")
    public localFunctionHoisting(): void {
        const code =
            `export const foo = bar();
            function bar() { return "bar"; }`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("bar");
    }

    @Test("Exported Function Hoisting")
    public exportedFunctionHoisting(): void {
        const code =
            `const foo = bar();
            export function bar() { return "bar"; }
            export const baz = foo;`;
        const result = util.transpileExecuteAndReturnExport(code, "baz");
        Expect(result).toBe("bar");
    }

    @Test("Namespace Function Hoisting")
    public namespaceFunctionHoisting(): void {
        const code =
            `let foo: string;
            namespace NS {
                foo = bar();
                function bar() { return "bar"; }
            }`;
        const result = util.transpileAndExecute("return foo;", undefined, undefined, code);
        Expect(result).toBe("bar");
    }

    @Test("Exported Namespace Function Hoisting")
    public exportedNamespaceFunctionHoisting(): void {
        const code =
            `let foo: string;
            namespace NS {
                foo = bar();
                export function bar() { return "bar"; }
            }`;
        const result = util.transpileAndExecute("return foo;", undefined, undefined, code);
        Expect(result).toBe("bar");
    }

    @TestCase("var", "foo")
    @TestCase("let", "bar")
    @TestCase("const", "bar")
    @Test("Hoisting in Non-Function Scope")
    public hoistingInNonFunctionScope(varType: string, expectResult: string): void {
        const code =
            `function foo() {
                ${varType} bar = "bar";
                for (let i = 0; i < 1; ++i) {
                    ${varType} bar = "foo";
                }
                return bar;
            }
            return foo();`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @TestCase("", "foofoo")
    @TestCase(" = \"bar\"", "barbar")
    @Test("Var hoisting from child scope")
    public varHoistingFromChildScope(initializer: string, expectResult: string): void {
        const code =
            `foo = "foo";
            let result: string;
            if (true) {
                var foo${initializer};
                result = foo;
            }
            return foo + result;`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe(expectResult);
    }

    @Test("Hoisting due to reference from hoisted function")
    public hoistingDueToReferenceFromHoistedFunction(): void {
        const code =
            `const foo = "foo";
            const result = bar();
            function bar() {
                return foo;
            }
            return result;`;
        const result = util.transpileAndExecute(code);
        Expect(result).toBe("foo");
    }

    @Test("Namespace Hoisting")
    public namespaceHoisting(): void {
        const code =
            `function bar() {
                return NS.foo;
            }
            namespace NS {
                export let foo = "foo";
            }
            export const foo = bar();`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @Test("Exported Namespace Hoisting")
    public exportedNamespaceHoisting(): void {
        const code =
            `function bar() {
                return NS.foo;
            }
            export namespace NS {
                export let foo = "foo";
            }
            export const foo = bar();`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @Test("Nested Namespace Hoisting")
    public nestedNamespaceHoisting(): void {
        const code =
            `export namespace Outer {
                export function bar() {
                    return Inner.foo;
                }
                namespace Inner {
                    export let foo = "foo";
                }
            }
            export const foo = Outer.bar();`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @Test("Class Hoisting")
    public classHoisting(): void {
        const code =
            `function makeFoo() {
                return new Foo();
            }
            class Foo {
                public bar = "foo";
            }
            export const foo = makeFoo().bar;`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @Test("Enum Hoisting")
    public enumHoisting(): void {
        const code =
            `function bar() {
                return E.A;
            }
            enum E {
                A = "foo"
            }
            export const foo = bar();`;
        const result = util.transpileExecuteAndReturnExport(code, "foo");
        Expect(result).toBe("foo");
    }

    @TestCase(`foo = "foo"; var foo;`, "foo")
    @TestCase(`foo = "foo"; export var foo;`, "foo")
    @TestCase(`function setBar() { const bar = foo; } let foo = "foo";`, "foo")
    @TestCase(`function setBar() { const bar = foo; } const foo = "foo";`, "foo")
    @TestCase(`function setBar() { const bar = foo; } export let foo = "foo";`, "foo")
    @TestCase(`function setBar() { const bar = foo; } export const foo = "foo";`, "foo")
    @TestCase(`const foo = bar(); function bar() { return "bar"; }`, "bar")
    @TestCase(`export const foo = bar(); function bar() { return "bar"; }`, "bar")
    @TestCase(`const foo = bar(); export function bar() { return "bar"; }`, "bar")
    @TestCase(`function bar() { return NS.foo; } namespace NS { export let foo = "foo"; }`, "NS")
    @TestCase(
        `export namespace O { export function f() { return I.foo; } namespace I { export let foo = "foo"; } }`,
        "I"
    )
    @TestCase(`function makeFoo() { return new Foo(); } class Foo {}`, "Foo")
    @TestCase(`function bar() { return E.A; } enum E { A = "foo" }`, "E")
    @Test("No Hoisting")
    public noHoisting(code: string, identifier: string): void {
        const compilerOptions: CompilerOptions = {
            noHoisting: true,
            luaLibImport: LuaLibImportKind.Require,
            luaTarget: LuaTarget.Lua53,
            target: ts.ScriptTarget.ES2015,
        };
        Expect(() => util.transpileString(code, compilerOptions)).toThrowError(
            TranspileError,
            `Identifier "${identifier}" was referenced before it was declared. The declaration ` +
            "must be moved before the identifier's use, or hoisting must be enabled."
        );
    }
}
