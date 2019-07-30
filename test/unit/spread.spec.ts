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
