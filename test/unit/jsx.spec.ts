import * as util from "../util";
import { TestBuilder } from "../util";
import { JsxEmit } from "typescript";
import { unsupportedJsxEmit } from "../../src/transpilation/diagnostics";
import { unsupportedNodeKind } from "../../src/transformation/utils/diagnostics";

// language=TypeScript
const reactLib = `
    export class Component {
        static isClass = true
    }

    namespace React {
        const isLua = typeof Component === "object"

        export function createElement(
            type: any,
            props?: any,
            ...children: any[]
        ) {
            let typeStr: string
            if (isLua) {
                typeStr =
                    typeof type === "function" ? "<< function >>" :
                    typeof type === "object" ? \`<< class \${type.name} >>\` :
                    type
            } else {
                typeStr = typeof type === "function" ? (type.isClass
                                                        ? \`<< class \${type.name} >>\`
                                                        : "<< function >>")
                                                     : type
            }

            return {
                type: typeStr,
                props,
                children
            };
        }

        export class Fragment extends Component {
        }
    }
    export default React;
`;
// language=TypeScript
const jsxTypings = `declare namespace JSX {
    interface IntrinsicElements {
        a: any
        b: any
        foo: any
        bar: any
        div: any
        "with-dash": any
    }
}
`;

function testJsx(...args: [string] | [TemplateStringsArray, ...any[]]): TestBuilder {
    return util
        .testFunction(...args)
        .setOptions({
            jsx: JsxEmit.React,
        })
        .setMainFileName("main.tsx")
        .addExtraFile("react.ts", reactLib)
        .addExtraFile("jsx.d.ts", jsxTypings)
        .setTsHeader('import React, { Component } from "./react";');
}

describe("jsx", () => {
    test("element", () => {
        testJsx`
            return <foo></foo>
        `.expectToMatchJsResult();
    });
    test("self closing element", () => {
        testJsx`
            return <foo />
        `.expectToMatchJsResult();
    });
    test("element with dash name", () => {
        testJsx`
            return <with-dash />
        `.expectToMatchJsResult();
    });
    test("custom element", () => {
        testJsx`
            function Foo() {}
            return <Foo />
        `.expectToMatchJsResult();
    });
    test("fragment", () => {
        testJsx`
            return <></>
        `.expectToMatchJsResult();
    });
    test("fragment with children", () => {
        testJsx`
            return <><a foo="bar" /><b bar="foo" /></>
        `.expectToMatchJsResult();
    });
    test("esoteric component names", () => {
        testJsx`
            class _Foo extends Component {}
            return <_Foo />
        `.expectToMatchJsResult();

        testJsx`
            class $ extends Component {}
            return <$ />
        `.expectToMatchJsResult();

        testJsx`
            class é extends Component {}
            return <é />
        `.expectToMatchJsResult();
    });
    test("nested elements", () => {
        testJsx`
            return <foo><bar></bar></foo>
        `.expectToMatchJsResult();
    });
    test("many nested elements", () => {
        testJsx`
            return <foo><a><b><bar></bar></b></a></foo>
        `.expectToMatchJsResult();
    });
    test("interpolated children", () => {
        testJsx`
            const x = 3
            return <foo>{x}</foo>
        `.expectToMatchJsResult();
    });
    test("string prop", () => {
        testJsx`
            return <a foo="bar" />
        `.expectToMatchJsResult();
    });
    test("value prop", () => {
        testJsx`
            const x = 5
            return <a foo={x} />
        `.expectToMatchJsResult();
    });
    test("quoted prop", () => {
        testJsx`
            return <a foo-bar={true} />
        `.expectToMatchJsResult();
    });
    test("shorthand prop", () => {
        testJsx`
            return <a foo />
        `.expectToMatchJsResult();
    });
    test("spaces in jsxText", () => {
        testJsx`
            return <a>this
                <b/> is  some<a/>multiline
                text    <a/>   thing.
                <b/>
            </a>
        `.expectToMatchJsResult();
    });
    test("multiline string jsxText", () => {
        testJsx`
            return <a>
                foo  bar
                baz
            </a>
        `.expectToMatchJsResult();
    });

    test("access tag value", () => {
        testJsx`
            const a = { b(){} };
            return <a.b c='d' />
        `.expectToMatchJsResult();
        testJsx`
            const a = { b: { c: { d(){} } } };
            return <a.b.c.d c='d'/>
        `.expectToMatchJsResult();
    });

    test("spread props", () => {
        testJsx`
            const x = {c: "d", e: "f"}
            return <a {...x} />
        `.expectToMatchJsResult();
        testJsx`
            const x = {c: "d", e: "no"}
            return <a a="b" {...x} e="f" />
        `.expectToMatchJsResult();
    });

    test("comment children", () => {
        testJsx`
            return <a>
                {/* comment */}
                {/* another comment */}
            </a>
        `.expectToMatchJsResult();
        testJsx`
            return <a>
                <b/>
                {/* comment */}
                <b/>
            </a>
        `.expectToMatchJsResult();
    });

    test("multiline string prop value", () => {
        testJsx`
             return <div value="This is a
               multi-line string."
      />
        `.expectToMatchJsResult();
        testJsx`
        return <div value="
               This is a longer
               multi-line string.
                  "
      />
        `.expectToMatchJsResult();
    });

    test("prop strings with entities", () => {
        testJsx`
            return <div value="a&gt;b" />
        `.expectToMatchJsResult();
    });
    test("jsxText with entities", () => {
        testJsx`
            return <a> 9+10&lt;21 </a>
        `.expectToMatchJsResult();
    });

    test("Spread children", () => {
        // doesn't actually "spread" (typescript's current behavior)
        testJsx`
            const children = [<a/>, <b/>]
            return <foo>{...children}</foo>
        `.expectToMatchJsResult();
    });

    test("complex", () => {
        testJsx`
            const x = 3
            const props = {one: "two", three: 4}
            return <div a="b">
                <a c="d" r={x}/>
                <b baz-bar {...props}> the {x}marks the spot </b>
                 a
                    {/** bar */}
                    and
                <> <a>2</a></>
                <b/>
            </div>
        `.expectToMatchJsResult();
    });

    // language=TypeScript
    const customJsxLib = `export namespace MyLib {
        export function myCreate(
            type: any,
            props: any,
            ...children: any[]
        ) {
            return { type: typeof type, props, children, myThing: true };
        }

        export function MyFragment() {
        }
    }
    `;

    test("custom JSX factory", () => {
        testJsx`
            return <a><b>c</b></a>
        `
            .setTsHeader('import { MyLib } from "./myJsx";')
            .setOptions({ jsxFactory: "MyLib.myCreate" })
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
        testJsx`
            return <a><b>c</b></a>
        `
            .setTsHeader('import { MyLib } from "./myJsx";const myCreate2 = MyLib.myCreate;')
            .setOptions({ jsxFactory: "myCreate2" })
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
    });
    test("custom JSX factory with noImplicitSelf", () => {
        testJsx`
            return <a><b>c</b></a>
        `
            .setTsHeader(
                `function createElement(tag: string | Function, props: { [key: string]: string | boolean }, ...children: any[]) {
                return { tag, children };
            }`
            )
            .setOptions({ jsxFactory: "createElement", noImplicitSelf: true })
            .expectToMatchJsResult();
    });
    test("custom fragment factory", () => {
        testJsx`
            return <><b>c</b></>
        `
            .setTsHeader('import { MyLib } from "./myJsx";')
            .setOptions({ jsxFactory: "MyLib.myCreate", jsxFragmentFactory: "MyLib.MyFragment" })
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
        testJsx`
            return <><b>c</b></>
        `
            .setTsHeader('import { MyLib } from "./myJsx";function MyFragment2(){};')
            .setOptions({ jsxFactory: "MyLib.myCreate", jsxFragmentFactory: "MyFragment2" })
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
    });
    test("custom JSX pragma", () => {
        testJsx`
            return <a><b>c</b></a>
        `
            .setTsHeader('/** @jsx MyLib.myCreate */\nimport { MyLib } from "./myJsx";')
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
        testJsx`
            return <a><b>c</b></a>
        `
            .setTsHeader('/** @jsx myCreate2 */import { MyLib } from "./myJsx";const myCreate2 = MyLib.myCreate;')
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
    });
    test("custom fragment pragma", () => {
        testJsx`
            return <><b>c</b></>
        `
            .setTsHeader(
                '/** @jsx MyLib.myCreate */\n/** @jsxFrag MyLib.MyFragment */\nimport { MyLib } from "./myJsx";'
            )
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
        testJsx`
            return <><b>c</b></>
        `
            .setTsHeader(
                "/** @jsx MyLib.myCreate */\n/** @jsxFrag MyFragment2 */\n" +
                    'import { MyLib } from "./myJsx";function MyFragment2(){};'
            )
            .setOptions({ jsxFactory: "MyLib.myCreate", jsxFragmentFactory: "MyFragment" })
            .addExtraFile("myJsx.ts", customJsxLib)
            .expectToMatchJsResult();
    });

    test("forward declare components", () => {
        testJsx`
            const foo = <Foo />

            function Foo(){}

            return foo
        `.expectToMatchJsResult();
    });

    test("invalid jsx config", () => {
        testJsx(`
            return <a/>
        `)
            .setOptions({
                jsx: JsxEmit.Preserve,
            })
            .expectToHaveDiagnostics([unsupportedJsxEmit.code, unsupportedNodeKind.code]);
    });
});
