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
    { input: "abcd", index: 3 },
    { input: "abcde", index: 3 },
    { input: "abcde", index: 0 },
    { input: "a", index: 0 },
])("string index (%p)", ({ input, index }) => {
    util.testExpressionTemplate`${input}[${index}]`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", searchValue: "", replaceValue: "" },
    { inp: "hello test", searchValue: " ", replaceValue: "" },
    { inp: "hello test", searchValue: "hello", replaceValue: "" },
    { inp: "hello test", searchValue: "test", replaceValue: "" },
    { inp: "hello test", searchValue: "test", replaceValue: "world" },
    { inp: "hello test", searchValue: "test", replaceValue: "%world" },
    { inp: "hello %test", searchValue: "test", replaceValue: "world" },
    { inp: "hello %test", searchValue: "%test", replaceValue: "world" },
    { inp: "hello test", searchValue: "test", replaceValue: (): string => "a" },
    { inp: "hello test", searchValue: "test", replaceValue: (): string => "%a" },
    { inp: "aaa", searchValue: "a", replaceValue: "b" },
])("string.replace (%p)", ({ inp, searchValue, replaceValue }) => {
    util.testExpression`"${inp}".replace(${util.formatCode(searchValue, replaceValue)})`.expectToMatchJsResult();
});

test.each([
    ["", ""],
    ["hello", "test"],
    ["hello", "test", "bye"],
    ["hello", 42],
    [42, "hello"],
])("string.concat[+] (%p)", (...elements) => {
    util.testExpression(elements.map(e => util.formatCode(e)).join(" + ")).expectToMatchJsResult();
});

test.each([
    { str: "", args: ["", ""] },
    { str: "hello", args: ["test"] },
    { str: "hello", args: [] },
    { str: "hello", args: ["test", "bye"] },
])("string.concatFct (%p)", ({ str, args }) => {
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
])("string.indexOf with offset (%p)", ({ inp, searchValue, offset }) => {
    util.testExpressionTemplate`${inp}.indexOf(${searchValue}, ${offset})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", searchValue: "t", x: 4, y: 3 },
    { inp: "hello test", searchValue: "h", x: 3, y: 4 },
])("string.indexOf with offset expression (%p)", ({ inp, searchValue, x, y }) => {
    util.testExpressionTemplate`${inp}.indexOf(${searchValue}, 2 > 1 && ${x} || ${y})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", args: [] },
    { inp: "hello test", args: [0] },
    { inp: "hello test", args: [1] },
    { inp: "hello test", args: [1, 2] },
    { inp: "hello test", args: [1, 5] },
])("string.slice (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".slice(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", args: [0] },
    { inp: "hello test", args: [1] },
    { inp: "hello test", args: [1, 2] },
    { inp: "hello test", args: [1, 5] },
])("string.substring (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".substring(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", start: 1, ignored: 0 },
    { inp: "hello test", start: 3, ignored: 0, end: 5 },
])("string.substring with expression (%p)", ({ inp, start, ignored, end }) => {
    const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
    util.testExpression`"${inp}".substring(${paramStr})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", args: [0] },
    { inp: "hello test", args: [1] },
    { inp: "hello test", args: [1, 2] },
    { inp: "hello test", args: [1, 5] },
])("string.substr (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".substr(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", start: 1, ignored: 0 },
    { inp: "hello test", start: 3, ignored: 0, end: 2 },
])("string.substr with expression (%p)", ({ inp, start, ignored, end }) => {
    const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
    const result = util.transpileAndExecute(`return "${inp}".substr(${paramStr})`);

    expect(result).toBe(inp.substr(start, end));
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

test.each([
    { inp: "hello test", index: 1 },
    { inp: "hello test", index: 2 },
    { inp: "hello test", index: 3 },
    { inp: "hello test", index: 99 },
])("string.charAt (%p)", ({ inp, index }) => {
    util.testExpressionTemplate`${inp}.charAt(${index})`.expectToMatchJsResult();
});

test.each([
    { inp: "hello test", index: 1 },
    { inp: "hello test", index: 2 },
    { inp: "hello test", index: 3 },
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
    { inp: "hello test", args: ["test"] },
    { inp: "hello test", args: ["test", 6] },
])("string.startsWith (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".startsWith(${util.formatCode(...args)})`.expectToMatchJsResult();
});

test.each<{ inp: string; args: Parameters<string["endsWith"]> }>([
    { inp: "hello test", args: [""] },
    { inp: "hello test", args: ["test"] },
    { inp: "hello test", args: ["hello"] },
    { inp: "hello test", args: ["hello", 5] },
])("string.endsWith (%p)", ({ inp, args }) => {
    util.testExpression`"${inp}".endsWith(${util.formatCode(...args)})`.expectToMatchJsResult();
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
    const code = `
            ${signature}: number {
                return string.length;
            }
            return generic("string");
        `;
    expect(util.transpileAndExecute(code)).toBe(6);
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
