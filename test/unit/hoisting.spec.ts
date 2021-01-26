import * as ts from "typescript";
import * as util from "../util";

test.each(["let", "const"])("Let/Const Hoisting (%p)", varType => {
    util.testFunction`
        let bar: string;
        function setBar() { bar = foo; }
        ${varType} foo = "foo";
        setBar();
        return foo;
    `.expectToMatchJsResult();
});

test.each(["let", "const"])("Exported Let/Const Hoisting (%p)", varType => {
    util.testModule`
        let bar: string;
        function setBar() { bar = foo; }
        export ${varType} foo = "foo";
        setBar();
    `.expectToMatchJsResult();
});

test("Global Function Hoisting", () => {
    util.testFunction`
        const foo = bar();
        function bar() { return "bar"; }
        return foo;
    `.expectToMatchJsResult();
});

test("Local Function Hoisting", () => {
    util.testModule`
        export const foo = bar();
        function bar() { return "bar"; }
    `.expectToMatchJsResult();
});

test("Exported Function Hoisting", () => {
    util.testModule`
        const foo = bar();
        export function bar() { return "bar"; }
        export const baz = foo;
    `
        .setReturnExport("baz")
        .expectToMatchJsResult();
});

test("Namespace Function Hoisting", () => {
    util.testFunction`
        return foo;
    `
        .setTsHeader(
            `
            let foo: string;
            namespace NS {
                foo = bar();
                function bar() { return "bar"; }
            }
        `
        )
        .expectToMatchJsResult();
});

test("Exported Namespace Function Hoisting", () => {
    util.testFunction("return foo;")
        .setTsHeader(
            `
            let foo: string;
            namespace NS {
                foo = bar();
                export function bar() { return "bar"; }
            }
        `
        )
        .expectToMatchJsResult();
});

test.each(["let", "const"])("Hoisting in Non-Function Scope (%p)", varType => {
    util.testFunction`
        function foo() {
            ${varType} bar = "bar";
            for (let i = 0; i < 1; ++i) {
                ${varType} bar = "foo";
            }
            return bar;
        }
        return foo();
    `.expectToMatchJsResult();
});

test("Hoisting due to reference from hoisted function", () => {
    util.testFunction`
        const foo = "foo";
        const result = bar();
        function bar() {
            return foo;
        }
        return result;
    `.expectToMatchJsResult();
});

test("Hoisting with synthetic source file node", () => {
    util.testModule`
        export const foo = bar();
        function bar() { return "bar"; }
    `
        .setCustomTransformers({
            before: [
                () => sourceFile =>
                    ts.updateSourceFileNode(
                        sourceFile,
                        [ts.createNotEmittedStatement(undefined!), ...sourceFile.statements],
                        sourceFile.isDeclarationFile,
                        sourceFile.referencedFiles,
                        sourceFile.typeReferenceDirectives,
                        sourceFile.hasNoDefaultLib,
                        sourceFile.libReferenceDirectives
                    ),
            ],
        })
        .expectToMatchJsResult();
});

test("Namespace Hoisting", () => {
    util.testModule`
        function bar() {
            return NS.foo;
        }
        namespace NS {
            export let foo = "foo";
        }
        export const foo = bar();
    `.expectToMatchJsResult();
});

test("Exported Namespace Hoisting", () => {
    util.testModule`
        function bar() {
            return NS.foo;
        }
        export namespace NS {
            export let foo = "foo";
        }
        export const foo = bar();
    `.expectToMatchJsResult();
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
    util.testModule`
        function makeFoo() {
            return new Foo();
        }
        class Foo {
            public bar = "foo";
        }
        export const foo = makeFoo().bar;
    `.expectToMatchJsResult();
});

test("Enum Hoisting", () => {
    util.testModule`
        function bar() {
            return E.A;
        }
        enum E {
            A = "foo"
        }
        export const foo = bar();
    `.expectToHaveNoDiagnostics();
});

test("Import hoisting (named)", () => {
    // TODO cant be tested with expectToEqualJSResult because of
    // the scuffed module setup in TestBuilder.executeJs (module hoisting is not possible)
    // should be updated once vm.module becomes stable
    util.testModule`
        export const result = foo;
        import { foo } from "./module";
    `
        .addExtraFile("module.ts", "export const foo = true;")
        .expectToEqual({ result: true });
});

test("Import hoisting (namespace)", () => {
    // TODO cant be tested with expectToEqualJSresult because of
    // the scuffed module setup in TestBuilder.executeJs (module hoisting is not possible)
    // should be updated once vm.module becomes stable
    util.testModule`
        export const result = m.foo;
        import * as m from "./module";
    `
        .addExtraFile("module.ts", "export const foo = true;")
        .expectToEqual({ result: true });
});

test("Import hoisting (side-effect)", () => {
    // TODO cant be tested with expectToEqualJSResult because of
    // the scuffed module setup in TestBuilder.executeJs (module hoisting is not possible)
    // should be updated once vm.module becomes stable
    util.testModule`
        export const result = (globalThis as any).result;
        import "./module";
    `
        .addExtraFile("module.ts", "(globalThis as any).result = true; export {};")
        .expectToEqual({ result: true });
});

test("Import hoisted before function", () => {
    // TODO Cant use expectToMatchJsResult because above is not valid TS/JS
    util.testModule`
        export let result: any;

        baz();
        function baz() {
            result = foo;
        }

        import { foo } from "./module";
    `
        .addExtraFile("module.ts", "export const foo = true;")
        .expectToEqual({ result: true });
});

test("Hoisting Shorthand Property", () => {
    util.testFunction`
        function foo() {
            return { bar }.bar;
        }
        let bar = "foobar";
        return foo();
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/944
test("Hoisting variable without initializer", () => {
    util.testFunction`
        function foo() {
            return x;
        }
        let x: number;
        return foo();
    `.expectToMatchJsResult();
});
