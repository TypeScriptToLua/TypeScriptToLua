import { LuaLibImportKind } from "../../../src";
import * as util from "../../util";

test("Supported lua string function", () => {
    const tsHeader = `
        declare global {
            interface String {
                upper(): string;
            }
        }
    `;

    util.testExpression`"test".upper()`.setTsHeader(tsHeader).expectToEqual("TEST");
});

test("string.toString()", () => {
    util.testExpression`"test".toString()`.expectToEqual("test");
});

test.each([[], [65], [65, 66], [65, 66, 67]])("String.fromCharCode (%p)", (...args) => {
    util.testExpression`String.fromCharCode(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { a: 12, b: 23, c: 43 },
    { a: "test", b: "hello", c: "bye" },
    { a: "test", b: 42, c: "bye" },
    { a: "test", b: 42, c: 12 },
    { a: "test", b: 42, c: true },
    { a: false, b: 42, c: 12 },
])("String Concat Operator (%p)", ({ a, b, c }) => {
    util.testFunctionTemplate`
        let a = ${a};
        let b = ${b};
        let c = ${c};
        return a + " " + b + " test " + c;
    `.expectToMatchJsResult();
});

test.each([
    { input: "01234", index: 0 },
    { input: "01234", index: 1 },
    { input: "01234", index: 4 },
    { input: "01234", index: 5 },
    { input: "01234", index: -1 },
    { input: "01234", index: 100 },
    { input: "01234", index: NaN },
    { input: "", index: 0 },
])("string index (%p)", ({ input, index }) => {
    util.testExpressionTemplate`${input}[${index}]`.expectToMatchJsResult();
});

test("string index (side effect)", () => {
    util.testFunction`
        let i = 0;
        const mystring = "abc";
        return mystring[i++];
    `.expectToMatchJsResult();
});

describe.each(["replace", "replaceAll"])("string.%s", method => {
    const testCases = [
        { inp: "hello test", searchValue: "", replaceValue: "" },
        { inp: "hello test", searchValue: "", replaceValue: "_" },
        { inp: "hello test", searchValue: " ", replaceValue: "" },
        { inp: "hello test", searchValue: "hello", replaceValue: "" },
        { inp: "hello test", searchValue: "test", replaceValue: "" },
        { inp: "hello test", searchValue: "test", replaceValue: "world" },
        { inp: "hello test", searchValue: "test", replaceValue: "%world" },
        { inp: "hello test", searchValue: "test", replaceValue: "." },
        { inp: "hello %test", searchValue: "test", replaceValue: "world" },
        { inp: "hello %test", searchValue: "%test", replaceValue: "world" },
        { inp: "hello test.", searchValue: ".", replaceValue: "$" },
        { inp: "aaa", searchValue: "a", replaceValue: "b" },
    ];

    test.each(testCases)("string replacer %p", ({ inp, searchValue, replaceValue }) => {
        util.testExpression`"${inp}${inp}".${method}(${util.formatCode(
            searchValue,
            replaceValue
        )})`.expectToMatchJsResult();
    });

    test.each(testCases)("function replacer %p", ({ inp, searchValue, replaceValue }) => {
        util.testFunction`
            const result = {
                args: [],
                string: ""
            }
            function replacer(...args: any[]): string {
                result.args.push(...args)
                return ${util.formatCode(replaceValue)}
            }
            result.string = "${inp}${inp}".${method}(${util.formatCode(searchValue)}, replacer)
            return result
        `.expectToMatchJsResult();
    });
});

test.each([
    ["", ""],
    ["hello", "test"],
    ["hello", "test", "bye"],
    ["hello", 42],
    [42, "hello"],
])("string + (%p)", (...elements: any[]) => {
    util.testExpression(elements.map(e => util.formatCode(e)).join(" + ")).expectToMatchJsResult();
});

test.each([
    { str: "", args: ["", ""] },
    { str: "hello", args: ["test"] },
    { str: "hello", args: [] },
    { str: "hello", args: ["test", "bye"] },
])("string.concat (%p)", ({ str, args }) => {
    util.testExpression`"${str}".concat(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", searchValue: "" },
    { inp: "hello test", searchValue: "t" },
    { inp: "hello test", searchValue: "h" },
    { inp: "hello test", searchValue: "invalid" },
    { inp: "hello.test", searchValue: "." },
])("string.indexOf (%p)", ({ inp, searchValue }) => {
    util.testExpressionTemplate`${inp}.indexOf(${searchValue})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", searchValue: "t", offset: 5 },
    { inp: "hello test", searchValue: "t", offset: 6 },
    { inp: "hello test", searchValue: "t", offset: 7 },
    { inp: "hello test", searchValue: "h", offset: 4 },
    { inp: "00100", searchValue: "1", offset: -1 },
    { inp: "00100", searchValue: "1", offset: -2 },
    { inp: "01010", searchValue: "1", offset: -3 },
])("string.indexOf with offset (%p)", ({ inp, searchValue, offset }) => {
    util.testExpressionTemplate`${inp}.indexOf(${searchValue}, ${offset})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", searchValue: "t", x: 4, y: 3 },
    { inp: "hello test", searchValue: "h", x: 3, y: 4 },
])("string.indexOf with offset expression (%p)", ({ inp, searchValue, x, y }) => {
    util.testExpressionTemplate`${inp}.indexOf(${searchValue}, 2 > 1 && ${x} || ${y})`.expectToMatchJsResult();
});

const stringPartCases = [
    { inp: "0123456789", args: [0] },
    { inp: "0123456789", args: [0, 0] },
    { inp: "0123456789", args: [1] },
    { inp: "0123456789", args: [1, 1] },
    { inp: "0123456789", args: [1, 5] },
    { inp: "0123456789", args: [5, 1] },
    { inp: "0123456789", args: [1, 100] },
    { inp: "0123456789", args: [100, 1] },
    { inp: "0123456789", args: [100, 101] },
    { inp: "0123456789", args: [-3] },
    { inp: "0123456789", args: [1, -1] },
    { inp: "0123456789", args: [-5, -2] },
    { inp: "0123456789", args: [NaN, 3] },
    { inp: "0123456789", args: [3, NaN] },
];

test.each([{ inp: "0123456789", args: [] }, { inp: "0123456789", args: [undefined, 5] }, ...stringPartCases])(
    "string.slice (%p)",
    ({ inp, args }) => {
        util.testExpression`"${inp}".slice(${util.formatCode(...args)})`.expectToMatchJsResult();
    }
);

test.each(stringPartCases)("string.substring (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".substring(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", start: 1, ignored: 0 },
    { inp: "hello test", start: 3, ignored: 0, end: 5 },
])("string.substring with expression (%p)", ({ inp, start, ignored, end }) => {
    const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
    util.testExpression`"${inp}".substring(${paramStr})`.expectToMatchJsResult();
});

test.each(stringPartCases)("string.substr (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".substr(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", start: 1, ignored: 0 },
    { inp: "hello test", start: 3, ignored: 0, end: 2 },
])("string.substr with expression (%p)", ({ inp, start, ignored, end }) => {
    const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
    util.testExpression`
        "${inp}".substr(${paramStr})
    `.expectToMatchJsResult();
});

test.each(["", "h", "hello"])("string.length (%p)", input => {
    util.testExpressionTemplate`${input}.length`.expectToMatchJsResult();
});

test.each(["hello TEST"])("string.toLowerCase (%p)", inp => {
    util.testExpressionTemplate`${inp}.toLowerCase()`.expectToMatchJsResult();
});

test.each(["hello test"])("string.toUpperCase (%p)", inp => {
    util.testExpressionTemplate`${inp}.toUpperCase()`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", separator: "" },
    { inp: "hello test", separator: " " },
    { inp: "hello test", separator: "h" },
    { inp: "hello test", separator: "t" },
    { inp: "hello test", separator: "l" },
    { inp: "hello test", separator: "invalid" },
    { inp: "hello test", separator: "hello test" },
])("string.split (%p)", ({ inp, separator }) => {
    util.testExpressionTemplate`${inp}.split(${separator})`.expectToMatchJsResult();
});

test("string.split inline", () => {
    util.testExpression`"a, b, c".split(",")`
        .setOptions({ luaLibImport: LuaLibImportKind.Inline })
        .expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1009
test("string.split inline empty separator", () => {
    util.testExpression`"a, b, c".split("")`
        .setOptions({ luaLibImport: LuaLibImportKind.Inline })
        .expectToMatchJsResult();
});

test.each([
    { inp: "hello test", index: 0 },
    { inp: "hello test", index: 1 },
    { inp: "hello test", index: 2 },
    { inp: "hello test", index: 3 },
    { inp: "hello test", index: 99 },
    { inp: "hello test", index: -1 },
    { inp: "hello test", index: -5 },
    { inp: "hello test", index: -99 },
    { inp: "hello test", index: NaN },
])("string.charAt (%p)", ({ inp, index }) => {
    util.testExpressionTemplate`${inp}.charAt(${index})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", index: 0 },
    { inp: "hello test", index: 1 },
    { inp: "hello test", index: 2 },
    { inp: "hello test", index: 3 },
    { inp: "hello test", index: 99 },
    { inp: "hello test", index: -1 },
    { inp: "hello test", index: -5 },
    { inp: "hello test", index: -99 },
    { inp: "hello test", index: NaN },
])("string.charCodeAt (%p)", ({ inp, index }) => {
    util.testExpressionTemplate`${inp}.charCodeAt(${index})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", index: 1, ignored: 0 },
    { inp: "hello test", index: 1, ignored: 2 },
    { inp: "hello test", index: 3, ignored: 2 },
    { inp: "hello test", index: 3, ignored: 99 },
])("string.charAt with expression (%p)", ({ inp, index, ignored }) => {
    util.testExpressionTemplate`${inp}.charAt(2 > 1 && ${index} || ${ignored})`.expectToMatchJsResult();
});

test.each<{ inp: string; args: Parameters<string["startsWith"]> }>([
    { inp: "hello test", args: [""] },
    { inp: "hello test", args: ["hello"] },
    { inp: "HELLO test", args: ["hello"] },
    { inp: "hello test", args: ["test"] },
    { inp: "hello test", args: ["test", 6] },
])("string.startsWith (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".startsWith(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each<{ inp: string; args: Parameters<string["endsWith"]> }>([
    { inp: "hello test", args: [""] },
    { inp: "hello test", args: ["test"] },
    { inp: "hello TEST", args: ["test"] },
    { inp: "hello test", args: ["hello"] },
    { inp: "hello test", args: ["hello", 5] },
])("string.endsWith (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".endsWith(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each<{ inp: string; args: Parameters<string["includes"]> }>([
    { inp: "hello test", args: [""] },
    { inp: "hello test", args: ["test"] },
    { inp: "HELLO TEST", args: ["test"] },
    { inp: "hello test", args: ["hello"] },
    { inp: "HELLO TEST", args: ["hello"] },
    { inp: "hello test", args: ["hello", 5] },
    { inp: "hello test", args: ["test", 6] },
])("string.includes (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".includes(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", count: 0 },
    { inp: "hello test", count: 1 },
    { inp: "hello test", count: 2 },
    { inp: "hello test", count: 1.1 },
    { inp: "hello test", count: 1.5 },
    { inp: "hello test", count: 1.9 },
])("string.repeat (%p)", ({ inp, count }) => {
    util.testExpression`"${inp}".repeat(${count})`.expectToMatchJsResult();
});

const padCases = [
    { inp: "foo", args: [0] },
    { inp: "foo", args: [3] },
    { inp: "foo", args: [5] },
    { inp: "foo", args: [4, "    "] },
    { inp: "foo", args: [10, "    "] },
    { inp: "foo", args: [5, "1234"] },
    { inp: "foo", args: [5.9, "1234"] },
    { inp: "foo", args: [NaN] },
];

test.each(padCases)("string.padStart (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".padStart(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each(padCases)("string.padEnd (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".padEnd(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    "function generic<T extends string>(string: T)",
    "type StringType = string; function generic<T extends StringType>(string: T)",
])("string constrained generic foreach (%p)", signature => {
    util.testFunction`
        ${signature}: number {
            return string.length;
        }
        return generic("string");
    `.expectToMatchJsResult();
});

const trimTestCases = [
    "",
    " ",
    "\t",
    "\t \t",
    " foo ",
    "\tfoo\t",
    "\ffoo\f",
    "\vfoo\v",
    "\uFEFFFoo\uFEFF",
    "\xA0Foo\xA0",
    " \t foo \t ",
    " foo    bar ",
    "\r\nfoo\n\r\n",
    "\r\nfoo\nbar\n\r\n",
];
describe.each(["trim", "trimEnd", "trimRight", "trimStart", "trimLeft"])("string.%s", trim => {
    test.each(trimTestCases)("matches JS result (%p)", testString => {
        util.testExpression`${util.formatCode(testString)}.${trim}()`.expectToMatchJsResult();
    });
});

test("string intersected method", () => {
    util.testFunction`
        type Vector = string & { abc(): Vector };
        return ({ abc: () => "a" } as Vector).abc();
    `.expectToMatchJsResult();
});

// Issue #1218: https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1218
test.each(['"foo"', "undefined"])("prototype call on nullable string (%p)", value => {
    util.testFunction`
        function toUpper(str?: string) {
            return str?.toUpperCase();
        }
        return toUpper(${value});
    `
        .setOptions({ strictNullChecks: true })
        .expectToMatchJsResult();
});

// Issue #1218: https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1218
test.each(["string | undefined", "string | null", "null | string", "null | undefined | string"])(
    "prototype call on nullable string type (%p)",
    type => {
        util.testFunction`
        function toUpper(str: ${type}) {
            return str?.toUpperCase();
        }
        return toUpper("foo");
    `
            .setOptions({ strictNullChecks: true })
            .expectToMatchJsResult();
    }
);
