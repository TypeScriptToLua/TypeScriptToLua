import * as util from "../util";
const fs = require("fs");

test.each([
    { inp: `{a:3,b:"4"}`, out: `{a = 3, b = "4"};` },
    { inp: `{"a":3,b:"4"}`, out: `{a = 3, b = "4"};` },
    { inp: `{["a"]:3,b:"4"}`, out: `{a = 3, b = "4"};` },
    { inp: `{["a"+123]:3,b:"4"}`, out: `{["a" .. 123] = 3, b = "4"};` },
    { inp: `{[myFunc()]:3,b:"4"}`, out: `{[myFunc(_G)] = 3, b = "4"};` },
    { inp: `{x}`, out: `{x = x};` },
])("Object Literal (%p)", ({ inp, out }) => {
    const lua = util.transpileString(`const myvar = ${inp};`);
    expect(lua).toBe(`local myvar = ${out}`);
});

test.each([{ input: "3", expected: 3 }])(
    "Shorthand Property Assignment (%p)",
    ({ input, expected }) => {
        const result = util.transpileAndExecute(`const x = ${input}; const o = {x}; return o.x;`);
        expect(result).toBe(expected);
    },
);

test("undefined as object key", () => {
    const code = `const foo = {undefined: "foo"};
        return foo.undefined;`;
    expect(util.transpileAndExecute(code)).toBe("foo");
});
