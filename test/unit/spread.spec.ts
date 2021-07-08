import * as path from "path";
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
            [tstl.LuaTarget.Universal]: builder => builder.tap(expectLualibUnpack).expectToMatchJsResult(),
            [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectUnpack),
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
    test("basic use", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                return pick(...args);
            }
            return test("a", "b", "c");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });

    test("body-less arrow function", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            const test = (...args: string[]) => pick(...args);
            return test("a", "b", "c");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });

    test("if statement", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                if (true) {
                    return pick(...args);
                }
            }
            return test("a", "b", "c");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });

    test("loop statement", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                do {
                    return pick(...args);
                } while (false);
            }
            return test("a", "b", "c");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });

    test("block statement", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                let result: string;
                {
                    result = pick(...args);
                }
                return result;
            }
            return test("a", "b", "c");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });

    test("finally clause", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                try {
                    throw "foobar";
                } catch {
                } finally {
                    return pick(...args);
                }
            }
            return test("a" ,"b", "c");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });

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
            .setOptions({ types: [path.resolve(__dirname, "../../language-extensions")] })
            .expectLuaToMatchSnapshot()
            .expectToEqual("b");
    });

    test("curry", () => {
        util.testFunction`
            function test<A extends any[]>(fn: (...args: A) => void, ...args: A) {
                return fn(...args);
            }
            return test((arg: string) => arg, "foobar");
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });
});

describe("vararg spread de-optimization", () => {
    test("array modification", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                args[1] = "foobar";
                return pick(...args);
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });

    test("array modification in hoisted function", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                hoisted();
                const result = pick(...args);
                function hoisted() { args[1] = "foobar"; }
                return result;
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });

    test("array modification in secondary hoisted function", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                function triggersHoisted() { hoisted(); }
                triggersHoisted();
                const result = pick(...args);
                function hoisted() { args[1] = "foobar"; }
                return result;
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });
});

describe("vararg spread in IIFE", () => {
    test("comma operator", () => {
        util.testFunction`
            function dummy() { return "foobar"; }
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                return (dummy(), pick(...args));
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });

    test("assignment expression", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                let x: string;
                return (x = pick(...args));
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });

    test("destructured assignment expression", () => {
        util.testFunction`
            function pick(...args: string[]) { return [args[1]]; }
            function test(...args: string[]) {
                let x: string;
                return ([x] = pick(...args));
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });

    test("property-access assignment expression", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                let x: {val?: string} = {};
                return (x.val = pick(...args));
            }
            return test("a", "b", "c");
        `.expectToMatchJsResult();
    });

    test("binary compound assignment", () => {
        util.testFunction`
            function pick(...args: number[]) { return args[1]; }
            function test(...args: number[]) {
                let x = 1;
                return x += pick(...args);
            }
            return test(1, 2, 3);
        `.expectToMatchJsResult();
    });

    test("postfix unary compound assignment", () => {
        util.testFunction`
            function pick(...args: number[]) { return args[1]; }
            function test(...args: number[]) {
                let x = [7, 8, 9];
                return x[pick(...args)]++;
            }
            return test(1, 2, 3);
        `.expectToMatchJsResult();
    });

    test("prefix unary compound assignment", () => {
        util.testFunction`
            function pick(...args: number[]) { return args[1]; }
            function test(...args: number[]) {
                let x = [7, 8, 9];
                return ++x[pick(...args)];
            }
            return test(1, 2, 3);
        `.expectToMatchJsResult();
    });

    test("try clause", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                try {
                    return pick(...args)
                } catch {}
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });

    test("catch clause", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                try {
                    throw "foobar";
                } catch {
                    return pick(...args)
                }
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });

    test("class expression", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            function test(...args: string[]) {
                const fooClass = class Foo { foo = pick(...args); };
                return new fooClass().foo;
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });

    test("self-referencing function expression", () => {
        util.testFunction`
            function pick(...args: string[]) { return args[1]; }
            const test = function testName(...args: string[]) {
                return \`\${typeof testName}:\${pick(...args)}\`;
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });

    test("method indirect access (access args)", () => {
        util.testFunction`
            const obj = { $method: () => obj.arg, arg: "foobar" };
            function getObj(...args: string[]) { obj.arg = args[1]; return obj; }
            function test(...args: string[]) {
                return getObj(...args).$method();
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });

    test("method indirect access (method args)", () => {
        util.testFunction`
            const obj = { $pick: (...args: string[]) => args[1] };
            function getObj() { return obj; }
            function test(...args: string[]) {
                return getObj().$pick(...args);
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });

    test("tagged template method indirect access", () => {
        util.testFunction`
            const obj = { $tag: (t: TemplateStringsArray, ...args: string[]) => args[1] };
            function getObj() { return obj; }
            function pick(...args: string[]): string { return args[1]; }
            function test(...args: string[]) {
                return getObj().$tag\`FOO\${pick(...args)}BAR\`;
            }
            return test("a" ,"b", "c");
        `.expectToMatchJsResult();
    });
});
