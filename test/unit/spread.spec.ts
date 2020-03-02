import * as tstl from "../../src";
import * as util from "../util";

// TODO: Make some utils for testing other targets
const expectUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toMatch(/[^.]unpack\(/);
const expectTableUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("table.unpack");

const spreadCases = [
    "1, 2, ...[3, 4, 5]",
    "...[1, 2], 3, 4, 5",
    "1, 2, ...'spread', 4, 5",
    "1, ...[[2]], 3",
    "...[1, 2, 3], 4, ...[5, 6]",
    "1, 2, ...[3, 4], ...[5, 6]",
];

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

    test.each(spreadCases)("of arguments (%p)", expression => {
        util.testFunction`
            function foo(...args) { return args }
            return foo(${expression});
        `.expectToMatchJsResult();
    });
});

describe("in array literal", () => {
    util.testEachVersion("of array literal", () => util.testExpression`[...[0, 1, 2]]`, {
        [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack),
        [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
    });

    test("of tuple return call", () => {
        util.testFunction`
            /** @tupleReturn */
            function tuple(...args) {
                return args;
            }

            return [...tuple(1, 2, 3), ...tuple(4, 5, 6)];
        `.expectToMatchJsResult();
    });

    test.each(spreadCases)("of array literal (%p)", expression => {
        util.testExpression`[${expression}]`.expectToMatchJsResult();
    });

    test.each(["", "string", "string with spaces", "string 1 2 3"])("of string literal (%p)", str => {
        util.testExpressionTemplate`[...${str}]`.expectToMatchJsResult();
    });

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
});

describe("in object literal", () => {
    test.each([
        "{ x: false, ...{ x: true, y: true } }",
        "{ ...{ x: true, y: true } }",
        "{ ...{ x: true }, ...{ y: true, z: true } }",
        "{ ...{ x: false }, x: true }",
        "{ ...{ x: false }, x: false, ...{ x: true } }",
    ])("of object literal (%p)", expression => {
        util.testExpression(expression).expectToMatchJsResult();
    });

    test("of object reference", () => {
        util.testFunction`
            const object = { x: 0, y: 1 };
            const result = { ...object, z: 2 };
            return { object, result };
        `.expectToMatchJsResult();
    });

    test.each([
        ["literal", "const object = { ...[0, 1, 2] };"],
        ["reference", "const array = [0, 1, 2]; const object = { ...array };"],
    ])("of array %p", (_name, expressionToCreateObject) => {
        util.testFunction`
            ${expressionToCreateObject}
            return { "0": object[0], "1": object[1], "2": object[2] };
        `.expectToMatchJsResult();
    });
});
