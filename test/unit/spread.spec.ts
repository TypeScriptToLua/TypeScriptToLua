import * as tstl from "../../src";
import * as util from "../util";

// TODO: Make some utils for testing other targets
const expectUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toMatch(/[^.]unpack\(/);
const expectTableUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("table.unpack");

describe("in function call", () => {
    util.testEachVersion(
        undefined,
        () => util.testFunction`
            function foo(a: number, b: number, ...rest: number[]) {
                return { a, b, rest }
            }

            const array = [0, 1, 2, 3] as const;
            return foo(...array);
        `,
        {
            [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
            [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack),
            [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack),
            [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
        }
    );
});

describe("in array literal", () => {
    test("of iterable", () => {
        util.testFunction`
            const it = {
                i: -1,
                [Symbol.iterator]() {
                    return this;
                },
                next() {
                    ++this.i;
                    return {
                        value: 2 ** this.i,
                        done: this.i == 9,
                    }
                }
            };

            return [...it]
        `.expectToMatchJsResult();
    });

    util.testEachVersion("of array literal", () => util.testExpression`[...[0, 1, 2]]`, {
        [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack),
        [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
    });
});

test.each(["", "string", "string with spaces", "string 1 2 3"])('Spread Element String "%s"', str => {
    const code = `
        const arr = [..."${str}"];
        return JSONStringify(arr)`;
    expect(JSON.parse(util.transpileAndExecute(code))).toEqual([...str]);
});

test.each([
    "{ value: false, ...{ value: true } }",
    "{ ...{ value: false }, value: true }",
    "{ ...{ value: false }, value: false, ...{ value: true } }",
    "{ ...{ x: true, y: true } }",
    "{ x: true, ...{ y: true, z: true } }",
    "{ ...{ x: true }, ...{ y: true, z: true } }",
])('SpreadAssignment "%s"', expression => {
    const code = `return JSONStringify(${expression});`;
    expect(JSON.parse(util.transpileAndExecute(code))).toEqual(eval(`(${expression})`));
});

test("SpreadAssignment Destructure", () => {
    const code = `let obj = { x: 0, y: 1, z: 2 };`;
    const luaCode = `
        ${code}
        return JSONStringify({ a: 0, ...obj, b: 1, c: 2 });`;
    const jsCode = `
        ${code}
        ({ a: 0, ...obj, b: 1, c: 2 })`;
    expect(JSON.parse(util.transpileAndExecute(luaCode))).toStrictEqual(eval(jsCode));
});

test("SpreadAssignment No Mutation", () => {
    const code = `
        const obj: { x: number, y: number, z?: number } = { x: 0, y: 1 };
        const merge = { ...obj, z: 2 };
        return obj.z;`;
    expect(util.transpileAndExecute(code)).toBe(undefined);
});

test.each([
    "function spread() { return [0, 1, 2] } const object = { ...spread() };",
    "const object = { ...[0, 1, 2] };",
])('SpreadAssignment Array "%s"', expressionToCreateObject => {
    const code = `
        ${expressionToCreateObject}
        return JSONStringify([object[0], object[1], object[2]]);`;
    expect(JSON.parse(util.transpileAndExecute(code))).toEqual([0, 1, 2]);
});

