import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

test("Unsuported string function", () => {
    expect(() => {
        util.transpileString(`return "test".testThisIsNoMember()`);
    }).toThrowExactError(
        TSTLErrors.UnsupportedProperty("string", "testThisIsNoMember", util.nodeStub),
    );
});

test("Suported lua string function", () => {
    expect(
        util.transpileAndExecute(
            `return "test".upper()`,
            undefined,
            undefined,
            `interface String { upper(): string; }`,
        ),
    ).toBe("TEST");
});

test.each([{ inp: [] }, { inp: [65] }, { inp: [65, 66] }, { inp: [65, 66, 67] }])(
    "String.fromCharCode (%p)",
    ({ inp }) => {
        const result = util.transpileAndExecute(`return String.fromCharCode(${inp.toString()})`);

        expect(result).toBe(String.fromCharCode(...inp));
    },
);

test.each([
    { a: 12, b: 23, c: 43 },
    { a: "test", b: "hello", c: "bye" },
    { a: "test", b: 42, c: "bye" },
    { a: "test", b: 42, c: 12 },
    { a: "test", b: 42, c: true },
    { a: false, b: 42, c: 12 },
])("Template Strings (%p)", ({ a, b, c }) => {
    const a1 = typeof a === "string" ? `'${a}'` : a;
    const b1 = typeof b === "string" ? `'${b}'` : b;
    const c1 = typeof c === "string" ? `'${c}'` : c;

    const result = util.transpileAndExecute(`
        let a = ${a1};
        let b = ${b1};
        let c = ${c1};
        return \`${a} ${b} test ${c}\`;
        `);

    expect(result).toBe(`${a} ${b} test ${c}`);
});

test.each([
    { a: 12, b: 23, c: 43 },
    { a: "test", b: "hello", c: "bye" },
    { a: "test", b: 42, c: "bye" },
    { a: "test", b: 42, c: 12 },
    { a: "test", b: 42, c: true },
    { a: false, b: 42, c: 12 },
])("String Concat Operator (%p)", ({ a, b, c }) => {
    const a1 = typeof a === "string" ? `'${a}'` : a;
    const b1 = typeof b === "string" ? `'${b}'` : b;
    const c1 = typeof c === "string" ? `'${c}'` : c;

    const result = util.transpileAndExecute(`
        let a = ${a1};
        let b = ${b1};
        let c = ${c1};
        return a + " " + b + " test " + c;
        `);

    expect(result).toBe(`${a} ${b} test ${c}`);
});

test.each([
    { input: "abcd", index: 3 },
    { input: "abcde", index: 3 },
    { input: "abcde", index: 0 },
    { input: "a", index: 0 },
])("string index (%p)", ({ input, index }) => {
    const result = util.transpileAndExecute(`return "${input}"[${index}];`);

    expect(result).toBe(input[index]);
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
    const replaceValueString =
        typeof replaceValue === "string" ? JSON.stringify(replaceValue) : replaceValue.toString();
    const result = util.transpileAndExecute(
        `return "${inp}".replace("${searchValue}", ${replaceValueString});`,
    );

    // https://github.com/Microsoft/TypeScript/issues/22378
    if (typeof replaceValue === "string") {
        expect(result).toBe(inp.replace(searchValue, replaceValue));
    } else {
        expect(result).toBe(inp.replace(searchValue, replaceValue));
    }
});

test.each([
    { inp: ["", ""], expected: "" },
    { inp: ["hello", "test"], expected: "hellotest" },
    { inp: ["hello", "test", "bye"], expected: "hellotestbye" },
    { inp: ["hello", 42], expected: "hello42" },
    { inp: [42, "hello"], expected: "42hello" },
])("string.concat[+] (%p)", ({ inp, expected }) => {
    const concatStr = inp.map(elem => (typeof elem === "string" ? `"${elem}"` : elem)).join(" + ");

    const result = util.transpileAndExecute(`return ${concatStr}`);

    expect(result).toBe(expected);
});

test.each([
    { str: "", param: ["", ""] },
    { str: "hello", param: ["test"] },
    { str: "hello", param: [] },
    { str: "hello", param: ["test", "bye"] },
])("string.concatFct (%p)", ({ str, param }) => {
    const paramStr = param.map(elem => `"${elem}"`).join(", ");
    const result = util.transpileAndExecute(`return "${str}".concat(${paramStr})`);
    expect(result).toBe(str.concat(...param));
});

test.each([
    { inp: "hello test", searchValue: "" },
    { inp: "hello test", searchValue: "t" },
    { inp: "hello test", searchValue: "h" },
    { inp: "hello test", searchValue: "invalid" },
])("string.indexOf (%p)", ({ inp, searchValue }) => {
    const result = util.transpileAndExecute(`return "${inp}".indexOf("${searchValue}")`);

    expect(result).toBe(inp.indexOf(searchValue));
});

test.each([
    { inp: "hello test", searchValue: "t", offset: 5 },
    { inp: "hello test", searchValue: "t", offset: 6 },
    { inp: "hello test", searchValue: "t", offset: 7 },
    { inp: "hello test", searchValue: "h", offset: 4 },
])("string.indexOf with offset (%p)", ({ inp, searchValue, offset }) => {
    const result = util.transpileAndExecute(`return "${inp}".indexOf("${searchValue}", ${offset})`);

    expect(result).toBe(inp.indexOf(searchValue, offset));
});

test.each([
    { inp: "hello test", searchValue: "t", x: 4, y: 3 },
    { inp: "hello test", searchValue: "h", x: 3, y: 4 },
])("string.indexOf with offset expression (%p)", ({ inp, searchValue, x, y }) => {
    const result = util.transpileAndExecute(
        `return "${inp}".indexOf("${searchValue}", 2 > 1 && ${x} || ${y})`,
    );

    expect(result).toBe(inp.indexOf(searchValue, x));
});

test.each([
    { inp: "hello test" },
    { inp: "hello test", start: 0 },
    { inp: "hello test", start: 1 },
    { inp: "hello test", start: 1, end: 2 },
    { inp: "hello test", start: 1, end: 5 },
])("string.slice (%p)", ({ inp, start, end }) => {
    const paramStr = start ? (end ? `${start}, ${end}` : `${start}`) : "";
    const result = util.transpileAndExecute(`return "${inp}".slice(${paramStr})`);

    expect(result).toBe(inp.slice(start, end));
});

test.each([
    { inp: "hello test", start: 0 },
    { inp: "hello test", start: 1 },
    { inp: "hello test", start: 1, end: 2 },
    { inp: "hello test", start: 1, end: 5 },
])("string.substring (%p)", ({ inp, start, end }) => {
    const paramStr = end ? `${start}, ${end}` : `${start}`;
    const result = util.transpileAndExecute(`return "${inp}".substring(${paramStr})`);

    expect(result).toBe(inp.substring(start, end));
});

test.each([
    { inp: "hello test", start: 1, ignored: 0 },
    { inp: "hello test", start: 3, ignored: 0, end: 5 },
])("string.substring with expression (%p)", ({ inp, start, ignored, end }) => {
    const paramStr = `2 > 1 && ${start} || ${ignored}` + (end ? `, ${end}` : "");
    const result = util.transpileAndExecute(`return "${inp}".substring(${paramStr})`);

    expect(result).toBe(inp.substring(start, end));
});

test.each([
    { inp: "hello test", start: 0 },
    { inp: "hello test", start: 1 },
    { inp: "hello test", start: 1, end: 2 },
    { inp: "hello test", start: 1, end: 5 },
])("string.substr (%p)", ({ inp, start, end }) => {
    const paramStr = end ? `${start}, ${end}` : `${start}`;
    const result = util.transpileAndExecute(`return "${inp}".substr(${paramStr})`);

    expect(result).toBe(inp.substr(start, end));
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
    const result = util.transpileAndExecute(`return "${input}".length`);

    expect(result).toBe(input.length);
});

test.each(["hello TEST"])("string.toLowerCase (%p)", inp => {
    const result = util.transpileAndExecute(`return "${inp}".toLowerCase()`);

    expect(result).toBe(inp.toLowerCase());
});

test.each(["hello test"])("string.toUpperCase (%p)", inp => {
    const result = util.transpileAndExecute(`return "${inp}".toUpperCase()`);

    expect(result).toBe(inp.toUpperCase());
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
    const result = util.transpileAndExecute(`return JSONStringify("${inp}".split("${separator}"))`);

    expect(result).toBe(JSON.stringify(inp.split(separator)));
});

test.each([
    { inp: "hello test", index: 1 },
    { inp: "hello test", index: 2 },
    { inp: "hello test", index: 3 },
    { inp: "hello test", index: 99 },
])("string.charAt (%p)", ({ inp, index }) => {
    const result = util.transpileAndExecute(`return "${inp}".charAt(${index})`);

    expect(result).toBe(inp.charAt(index));
});

test.each([
    { inp: "hello test", index: 1 },
    { inp: "hello test", index: 2 },
    { inp: "hello test", index: 3 },
])("string.charCodeAt (%p)", ({ inp, index }) => {
    const result = util.transpileAndExecute(`return "${inp}".charCodeAt(${index})`);

    expect(result).toBe(inp.charCodeAt(index));
});

test.each([
    { inp: "hello test", index: 1, ignored: 0 },
    { inp: "hello test", index: 1, ignored: 2 },
    { inp: "hello test", index: 3, ignored: 2 },
    { inp: "hello test", index: 3, ignored: 99 },
])("string.charAt with expression (%p)", ({ inp, index, ignored }) => {
    const result = util.transpileAndExecute(
        `return "${inp}".charAt(2 > 1 && ${index} || ${ignored})`,
    );

    expect(result).toBe(inp.charAt(index));
});

test.each<{ inp: string; args: Parameters<string["startsWith"]> }>([
    { inp: "hello test", args: [""] },
    { inp: "hello test", args: ["hello"] },
    { inp: "hello test", args: ["test"] },
    { inp: "hello test", args: ["test", 6] },
])("string.startsWith (%p)", ({ inp, args }) => {
    const argsString = util.valuesToString(args);
    const result = util.transpileAndExecute(`return "${inp}".startsWith(${argsString})`);

    expect(result).toBe(inp.startsWith(...args));
});

test.each<{ inp: string; args: Parameters<string["endsWith"]> }>([
    { inp: "hello test", args: [""] },
    { inp: "hello test", args: ["test"] },
    { inp: "hello test", args: ["hello"] },
    { inp: "hello test", args: ["hello", 5] },
])("string.endsWith (%p)", ({ inp, args }) => {
    const argsString = util.valuesToString(args);
    const result = util.transpileAndExecute(`return "${inp}".endsWith(${argsString})`);

    expect(result).toBe(inp.endsWith(...args));
});

test.each([
    { inp: "hello test", count: 0 },
    { inp: "hello test", count: 1 },
    { inp: "hello test", count: 2 },
    { inp: "hello test", count: 1.1 },
    { inp: "hello test", count: 1.5 },
    { inp: "hello test", count: 1.9 },
])("string.repeat (%p)", ({ inp, count }) => {
    const result = util.transpileAndExecute(`return "${inp}".repeat(${count})`);

    expect(result).toBe(inp.repeat(count));
});

const padCases = [
    { inp: "foo", maxLength: 0 },
    { inp: "foo", maxLength: 3 },
    { inp: "foo", maxLength: 5 },
    { inp: "foo", maxLength: 4, fillString: "    " },
    { inp: "foo", maxLength: 10, fillString: "    " },
    { inp: "foo", maxLength: 5, fillString: "1234" },
    { inp: "foo", maxLength: 5.9, fillString: "1234" },
    { inp: "foo", maxLength: NaN },
];

test.each(padCases)("string.padStart (%p)", ({ inp, maxLength, fillString }) => {
    const argsString = util.valuesToString([maxLength, fillString]);
    const result = util.transpileAndExecute(`return "${inp}".padStart(${argsString})`);

    expect(result).toBe(inp.padStart(maxLength, fillString));
});

test.each(padCases)("string.padEnd (%p)", ({ inp, maxLength, fillString }) => {
    const argsString = util.valuesToString([maxLength, fillString]);
    const result = util.transpileAndExecute(`return "${inp}".padEnd(${argsString})`);

    expect(result).toBe(inp.padEnd(maxLength, fillString));
});
