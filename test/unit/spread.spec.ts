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

    test.each(arrayLiteralCases)("of multi return call (%p)", expression => {
        util.testFunction`
            function tuple(...args: any[]) {
                return $multi(...args);
            }

            return ${factory(`...tuple(${expression})`)};
        `
            .withLanguageExtensions()
            .expectToMatchJsResult();
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
            [tstl.LuaTarget.Universal]: builder => builder.tap(expectLualibUnpack).expectToMatchJsResult(),
            [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
            [tstl.LuaTarget.Lua50]: builder => builder.tap(expectUnpack).expectToMatchJsResult(),
            [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack).expectToMatchJsResult(),
            [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
            [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
            [tstl.LuaTarget.Lua54]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
        }
    );
});

describe("in array literal", () => {
    util.testEachVersion(undefined, () => util.testExpression`[...[0, 1, 2]]`, {
        [tstl.LuaTarget.Universal]: builder => builder.tap(expectLualibUnpack).expectToMatchJsResult(),
        [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
        [tstl.LuaTarget.Lua50]: builder => builder.tap(expectUnpack).expectToMatchJsResult(),
        [tstl.LuaTarget.Lua51]: builder => builder.tap(expectUnpack).expectToMatchJsResult(),
        [tstl.LuaTarget.Lua52]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
        [tstl.LuaTarget.Lua53]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
        [tstl.LuaTarget.Lua54]: builder => builder.tap(expectTableUnpack).expectToMatchJsResult(),
    });

    test("of array literal /w OmittedExpression", () => {
        util.testFunction`
            const array = [1, 2, ...[3], 5, , 6];
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

describe("vararg spread optimization", () => {
    util.testEachVersion(
        "basic use",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                return pick(...args);
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "body-less arrow function",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            const test = (...args: string[]) => pick(...args);
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "if statement",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                if (true) {
                    return pick(...args);
                }
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "loop statement",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                do {
                    return pick(...args);
                } while (false);
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "block statement",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                let result: string;
                {
                    result = pick(...args);
                }
                return result;
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "finally clause",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                try {
                    throw "foobar";
                } catch {
                } finally {
                    return pick(...args);
                }
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    test("$multi", () => {
        util.testFunction`
            function multi(...args: string[]) {
                return $multi(...args);
            }
            function test(...args: string[]) {
                return multi(...args)[1];
            }
            return test("a" ,"b", "c");
        `
            .withLanguageExtensions()
            .expectLuaToMatchSnapshot()
            .expectToEqual("b");
    });

    util.testEachVersion(
        "curry",
        () => util.testFunction`
            function test<A extends any[]>(fn: (...args: A) => void, ...args: A) {
                return fn(...args);
            }
            return test((arg: string) => arg, "foobar");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "curry with indirect type",
        () => util.testFunction`
            function test<A extends any[]>(obj: {fn: (...args: A) => void}, ...args: A) {
                const fn = obj.fn;
                return fn(...args);
            }
            return test({fn: (arg: string) => arg}, "foobar");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "function type declared inside scope",
        () => util.testFunction`
            function test<A extends any[]>(...args: A) {
                const fn: (...args: A) => A[0] = (...args) => args[0];
                return fn(...args);
            }
            test("foobar");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "With cast",
        () => util.testFunction`
            function pick(...args: any[]) { return args[1]; }
            function test<F extends (...args: any)=>any>(...args: Parameters<F>) {
                return pick(...(args as any[]));
            }
            return test<(...args: string[])=>void>("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );
});

describe("vararg spread de-optimization", () => {
    util.testEachVersion(
        "array modification",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                args[1] = "foobar";
                return pick(...args);
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "array modification in hoisted function",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                hoisted();
                const result = pick(...args);
                function hoisted() { args[1] = "foobar"; }
                return result;
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "array modification in secondary hoisted function",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                function triggersHoisted() { hoisted(); }
                triggersHoisted();
                const result = pick(...args);
                function hoisted() { args[1] = "foobar"; }
                return result;
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );
});

describe("vararg spread in IIFE", () => {
    util.testEachVersion(
        "comma operator",
        () => util.testFunction`
            function dummy() { return "foobar"; }
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                return (dummy(), pick(...args));
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "assignment expression",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                let x: string;
                return (x = pick(...args));
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "destructured assignment expression",
        () => util.testFunction`
            function pick(...args: string[]) { return [args[1]]; }
            function test(...args: string[]) {
                let x: string;
                return ([x] = pick(...args));
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "property-access assignment expression",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                let x: {val?: string} = {};
                return (x.val = pick(...args));
            }
            return test("a", "b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "binary compound assignment",
        () => util.testFunction`
            function pick(...args: number[]) { return args[1]; }
            function test(...args: number[]) {
                let x = 1;
                return x += pick(...args);
            }
            return test(1, 2, 3);`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "postfix unary compound assignment",
        () => util.testFunction`
            function pick(...args: number[]) { return args[1]; }
            function test(...args: number[]) {
                let x = [7, 8, 9];
                return x[pick(...args)]++;
            }
            return test(1, 2, 3);`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "prefix unary compound assignment",
        () => util.testFunction`
            function pick(...args: number[]) { return args[1]; }
            function test(...args: number[]) {
                let x = [7, 8, 9];
                return ++x[pick(...args)];
            }
            return test(1, 2, 3);`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "try clause",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                try {
                    return pick(...args)
                } catch {}
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "catch clause",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                try {
                    throw "foobar";
                } catch {
                    return pick(...args)
                }
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "class expression",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                const fooClass = class Foo { foo = pick(...args); };
                return new fooClass().foo;
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "self-referencing function expression",
        () => util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            const test = function testName(...args: string[]) {
                return \`\${typeof testName}:\${pick(...args)}\`;
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "method indirect access (access args)",
        () => util.testFunction`
            const obj = { $method: () => obj.arg, arg: "foobar" };
            function getObj(...args: string[]) { obj.arg = args[1]; return obj; }
            function test(...args: string[]) {
                return getObj(...args).$method();
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "method indirect access (method args)",
        () => util.testFunction`
            const obj = { $pick: (...args: string[]) => args[1] };
            function getObj() { return obj; }
            function test(...args: string[]) {
                return getObj().$pick(...args);
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );

    util.testEachVersion(
        "tagged template method indirect access",
        () => util.testFunction`
            const obj = { $tag: (t: TemplateStringsArray, ...args: string[]) => args[1] };
            function getObj() { return obj; }
            function pick(...args: string[]): string { return args[1]; }
            function test(...args: string[]) {
                return getObj().$tag\`FOO\${pick(...args)}BAR\`;
            }
            return test("a" ,"b", "c");`,
        util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
    );
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1244
test.each(["pairs", "ipairs"])("can spread %s (#1244)", func => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        return [...${func}(arr)];
    `
        .withLanguageExtensions()
        .setTsHeader(
            `
            declare function ipairs<T>(this: void, t: T): LuaIterable<LuaMultiReturn<[number, NonNullable<T[keyof T]>]>>;
            declare function pairs<T>(this: void, t: T): LuaIterable<LuaMultiReturn<[keyof T, NonNullable<T[keyof T]>]>>;
            `
        )
        .expectToEqual([
            [1, "a"],
            [2, "b"],
            [3, "c"],
        ]);
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1244
test.each(["LuaTable", "LuaMap"])("can spread %s (#1244)", type => {
    const result: Array<[string, string]> = util.testFunction`
        const tbl = new ${type}();
        tbl.set("foo", "bar");
        tbl.set("fizz", "buzz");
        return [...pairs(tbl)];
    `
        .withLanguageExtensions()
        .setTsHeader(
            "declare function pairs<T>(this: void, t: T): LuaIterable<LuaMultiReturn<[keyof T, NonNullable<T[keyof T]>]>>;"
        )
        .getLuaExecutionResult();

    // We don't know the order so match like this
    expect(result).toHaveLength(2);
    expect(result.some(([k, v]) => k === "foo" && v === "bar")).toBe(true);
    expect(result.some(([k, v]) => k === "fizz" && v === "buzz")).toBe(true);
});
