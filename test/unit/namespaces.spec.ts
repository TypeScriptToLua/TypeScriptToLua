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
        `namespace a { export function foo() { return "bar"; } }`
    );

    expect(result).toBe("bar");
});

test("nested namespace", () => {
    util.testModule`
        namespace A {
            namespace B {
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

test("namespace merged with interface", () => {
    util.testModule`
        interface Foo {}
        namespace Foo {
            export function bar() { return "foobar"; }
        }

        export const result = Foo.bar();
    `.expectToMatchJsResult();
});

test("namespace merged across files", () => {
    const testA = `
        namespace NS {
            export namespace Inner {
                export const foo = "foo";
            }
        }
    `;

    const testB = `
        namespace NS {
            export namespace Inner {
                export const bar = "bar";
            }
        }
    `;

    const { transpiledFiles } = util.transpileStringsAsProject({ "testA.ts": testA, "testB.ts": testB });
    const lua = transpiledFiles.map(f => f.lua).join("\n") + "\nreturn NS.Inner.foo .. NS.Inner.bar";
    expect(util.executeLua(lua)).toBe("foobar");
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
        .setExport("result")
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
