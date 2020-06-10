import * as tstl from "../../src";
import * as util from "../util";
import { formatCode } from "../util";

// TODO: Make some utils for testing other targets
const expectUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toMatch(/[^.]unpack\(/);
const expectTableUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("table.unpack");
const expectLualibUnpack: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("__TS__Unpack");

const arrayLiteralCases = [
    "1, 2, ...[3, 4, 5]",
    "...[1, 2], 3, 4, 5",
    "1, ...[[2]], 3",
    "...[1, 2, 3], 4, ...[5, 6]",
    "1, 2, ...[3, 4], ...[5, 6]",
];

describe.each(["function call", "array literal"] as const)("in %s", kind => {
    const factory = (code: string) => (kind === "function call" ? `((...args: any[]) => args)(${code})` : `[${code}]`);

    test.each(arrayLiteralCases)("of array literal (%p)", expression => {
        util.testExpression(factory(expression)).expectToMatchJsResult();
    });

    test.each(arrayLiteralCases)("of tuple return call (%p)", expression => {
        util.testFunction`
            /** @tupleReturn */
            function tuple(...args: any[]) {
                return args;
            }

            return ${factory(`...tuple(${expression})`)};
        `.expectToMatchJsResult();
    });

    test("of multiple string literals", () => {
        util.testExpression(factory('..."spread", ..."string"')).expectToMatchJsResult();
    });

    test.each(["", "string", "string with spaces", "string 1 2 3"])("of string literal (%p)", str => {
        util.testExpression(factory(`...${formatCode(str)}`)).expectToMatchJsResult();
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

            return ${factory("...it")};
        `.expectToMatchJsResult();
    });
});

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
            [tstl.LuaTarget.Universal]: builder => builder.tap(expectLualibUnpack),
            [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
            [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack),
            [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack),
            [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
        }
    );
});

describe("in array literal", () => {
    util.testEachVersion(undefined, () => util.testExpression`[...[0, 1, 2]]`, {
        [tstl.LuaTarget.Universal]: builder => builder.tap(expectLualibUnpack),
        [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack),
        [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
    });

    test("of array literal /w OmittedExpression", () => {
        util.testFunction`
            const array = [1, 2, ...[3], , 5];
            return { a: array[0], b: array[1], c: array[2], d: array[3] };
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
