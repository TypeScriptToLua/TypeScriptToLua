import * as util from "../util";

test("legacy internal module syntax", () => {
    util.testModule`
        module Foo {
            export const foo = "bar";
        }

        export const foo = Foo.foo;
    `.expectToMatchJsResult();
});

test("global scoping", () => {
    const result = util.transpileAndExecute(
        "return a.foo();",
        undefined,
        undefined,
        'namespace a { export function foo() { return "bar"; } }'
    );

    expect(result).toBe("bar");
});

test("nested namespace", () => {
    util.testModule`
        namespace A {
            export namespace B {
                export const foo = "foo";
            }
        }

        export const foo = A.B.foo;
    `.expectToMatchJsResult();
});

test("nested namespace with dot in name", () => {
    util.testModule`
        namespace A.B {
            export const foo = "foo";
        }

        export const foo = A.B.foo;
    `.expectToMatchJsResult();
});

test("context in namespace function", () => {
    util.testModule`
        namespace a {
            export const foo = "foo";
            export function bar() { return this.foo + "bar"; }
        }

        export const result = a.bar();
    `.expectToMatchJsResult();
});

test("namespace merging", () => {
    util.testModule`
        export namespace Foo {
            export const a = 1;
        }

        export namespace Foo {
            export const b = 2;
        }
    `.expectToMatchJsResult();
});

test("namespace merging with interface", () => {
    util.testModule`
        interface Foo {}
        namespace Foo {
            export function bar() { return "foobar"; }
        }

        export const result = Foo.bar();
    `.expectToMatchJsResult();
});

test("namespace merging across files", () => {
    const a = `
        namespace NS {
            export namespace Inner {
                export const foo = "foo";
            }
        }
    `;

    const b = `
        namespace NS {
            export namespace Inner {
                export const bar = "bar";
            }
        }
    `;

    util.testBundle`
        import './a';
        import './b';

        export const result = NS.Inner;
    `
        .addExtraFile("a.ts", a)
        .addExtraFile("b.ts", b)
        .expectToEqual({ result: { foo: "foo", bar: "bar" } });
});

test("declared namespace function call", () => {
    const luaHeader = `
        myNameSpace = {}
        function myNameSpace.declaredFunction(x) return 3*x end
    `;

    util.testModule`
        declare namespace myNameSpace {
            function declaredFunction(this: void, x: number): number;
        }

        export const result = myNameSpace.declaredFunction(2);
    `
        .setReturnExport("result")
        .setLuaHeader(luaHeader)
        .expectToEqual(6);
});

test("`import =` on a namespace", () => {
    util.testModule`
        namespace outerNamespace {
            export namespace innerNamespace {
                export function func() {
                    return "foo";
                }
            }
        }

        import importedFunc = outerNamespace.innerNamespace.func;
        export const result = importedFunc();
    `.expectToMatchJsResult();
});

test("enum in a namespace", () => {
    util.testModule`
        namespace Test {
            export enum TestEnum {
                A,
            }
        }

        export const result = Test.TestEnum.A;
    `.expectToMatchJsResult();
});
