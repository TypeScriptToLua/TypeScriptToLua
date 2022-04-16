import * as tstl from "../../src";
import { forbiddenForIn, unsupportedForTarget } from "../../src/transformation/utils/diagnostics";
import * as util from "../util";

test("while", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        let i = 0;
        while (i < arrTest.length) {
            arrTest[i] = arrTest[i] + 1;
            i++;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("while with continue", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3, 4];
        let i = 0;
        while (i < arrTest.length) {
            if (i % 2 == 0) {
                i++;
                continue;
            }
            let j = 2;
            while (j > 0) {
                if (j == 2) {
                    j--
                    continue;
                }
                arrTest[i] = j;
                j--;
            }

            i++;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("dowhile with continue", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3, 4];
        let i = 0;
        do {
            if (i % 2 == 0) {
                i++;
                continue;
            }
            let j = 2;
            do {
                if (j == 2) {
                    j--
                    continue;
                }
                arrTest[i] = j;
                j--;
            } while (j > 0)

            i++;
        } while (i < arrTest.length)
        return arrTest;
    `.expectToMatchJsResult();
});

test("for", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        for (let i = 0; i < arrTest.length; ++i) {
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("for with expression", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        let i: number;
        for (i = 0 * 1; i < arrTest.length; ++i) {
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("for with continue", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3, 4];
        for (let i = 0; i < arrTest.length; i++) {
            if (i % 2 == 0) {
                continue;
            }

            for (let j = 0; j < 2; j++) {
                if (j == 1) {
                    continue;
                }
                arrTest[i] = j;
            }
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("forMirror", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        for (let i = 0; arrTest.length > i; i++) {
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("forBreak", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        for (let i = 0; i < arrTest.length; ++i) {
            break;
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("forNoDeclarations", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        let i = 0;
        for (; i < arrTest.length; ++i) {
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("forNoCondition", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        let i = 0;
        for (;; ++i) {
            if (i >= arrTest.length) {
                break;
            }

            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("forNoPostExpression", () => {
    util.testFunction`
        let arrTest = [0, 1, 2, 3];
        let i = 0;
        for (;;) {
            if (i >= arrTest.length) {
                break;
            }

            arrTest[i] = arrTest[i] + 1;

            i++;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test.each([
    { inp: [0, 1, 2, 3], header: "let i = 0; i < arrTest.length; i++" },
    { inp: [0, 1, 2, 3], header: "let i = 0; i <= arrTest.length - 1; i++" },
    { inp: [0, 1, 2, 3], header: "let i = 0; arrTest.length > i; i++" },
    { inp: [0, 1, 2, 3], header: "let i = 0; arrTest.length - 1 >= i; i++" },
    { inp: [0, 1, 2, 3], header: "let i = 0; i < arrTest.length; i += 2" },
    { inp: [0, 1, 2, 3], header: "let i = arrTest.length - 1; i >= 0; i--" },
    { inp: [0, 1, 2, 3], header: "let i = arrTest.length - 1; i >= 0; i -= 2" },
    { inp: [0, 1, 2, 3], header: "let i = arrTest.length - 1; i > 0; i -= 2" },
])("forheader (%p)", ({ inp, header }) => {
    util.testFunction`
        let arrTest = ${util.formatCode(inp)};
        for (${header}) {
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("for scope", () => {
    util.testFunction`
        let i = 42;
        for (let i = 0; i < 10; ++i) {}
        return i;
    `.expectToMatchJsResult();
});

test.each([
    {
        inp: { test1: 0, test2: 1, test3: 2 },
    },
])("forin[Object] (%p)", ({ inp }) => {
    util.testFunctionTemplate`
        let objTest = ${inp};
        for (let key in objTest) {
            objTest[key] = objTest[key] + 1;
        }
        return objTest;
    `.expectToMatchJsResult();
});

test("forin[Array]", () => {
    util.testFunction`
        const array = [];
        for (const key in array) {}
    `.expectDiagnosticsToMatchSnapshot([forbiddenForIn.code]);
});

test.each([{ inp: { a: 0, b: 1, c: 2, d: 3, e: 4 } }])("forin with continue (%p)", ({ inp }) => {
    util.testFunctionTemplate`
            let obj = ${inp};
            for (let i in obj) {
                if (obj[i] % 2 == 0) {
                    continue;
                }

                obj[i] = 0;
            }
            return obj;
        `.expectToMatchJsResult();
});

test.each([{ inp: [0, 1, 2] }])("forof (%p)", ({ inp }) => {
    util.testFunctionTemplate`
        let objTest = ${inp};
        let arrResultTest = [];
        for (let value of objTest) {
            arrResultTest.push(value + 1)
        }
        return arrResultTest;
    `.expectToMatchJsResult();
});

test("Tuple loop", () => {
    util.testFunction`
        const tuple: [number, number, number] = [3,5,1];
        let count = 0;
        for (const value of tuple) { count += value; }
        return count;
    `.expectToMatchJsResult();
});

test("forof existing variable", () => {
    util.testFunction`
        let objTest = [0, 1, 2];
        let arrResultTest = [];
        let value: number;
        for (value of objTest) {
            arrResultTest.push(value + 1)
        }
        return arrResultTest;
    `.expectToMatchJsResult();
});

test("forof destructing", () => {
    const input = [
        [1, 2],
        [2, 3],
        [3, 4],
    ];

    util.testFunction`
        let objTest = ${util.formatCode(input)};
        let arrResultTest = [];
        for (let [a,b] of objTest) {
            arrResultTest.push(a + b)
        }
        return arrResultTest;
    `.expectToMatchJsResult();
});

test("forof destructing scope", () => {
    util.testFunction`
        let x = 7;
        for (let [x] of [[1], [2], [3]]) {
            x *= 2;
        }
        return x;
    `.expectToMatchJsResult();
});

// This catches the case where x is falsely seen as globally scoped and the 'local' is stripped out
test("forof destructing scope (global)", () => {
    util.testModule`
        let x = 7;
        for (let [x] of [[1], [2], [3]]) {
            x *= 2;
        }
        if (x !== 7) throw x;
    `.expectNoExecutionError();
});

test("forof nested destructing", () => {
    util.testFunction`
        const obj = { a: [3], b: [5] };
        let result = 0;

        for(const [k, [v]] of Object.entries(obj)){
            result += v;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof destructing with existing variables", () => {
    const input = [
        [1, 2],
        [2, 3],
        [3, 4],
    ];

    util.testFunction`
        let objTest = ${util.formatCode(input)};
        let arrResultTest = [];
        let a: number;
        let b: number;
        for ([a,b] of objTest) {
            arrResultTest.push(a + b)
        }
        return arrResultTest;
    `.expectToMatchJsResult();
});

test("forof with continue", () => {
    util.testFunction`
        let testArr = [0, 1, 2, 3, 4];
        let a = 0;
        for (let i of testArr) {
            if (i % 2 == 0) {
                a++;
                continue;
            }

            for (let j of [0, 1]) {
                if (j == 1) {
                    continue;
                }
                testArr[a] = j;
            }
            a++;
        }
        return testArr;
    `.expectToMatchJsResult();
});

test("forof with iterator", () => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        function iter(): IterableIterator<string> {
            let i = 0;
            return {
                [Symbol.iterator]() { return this; },
                next() { return {value: arr[i], done: i++ >= arr.length} },
            }
        }
        let result = "";
        for (let e of iter()) {
            result += e;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof with iterator and existing variable", () => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        function iter(): IterableIterator<string> {
            let i = 0;
            return {
                [Symbol.iterator]() { return this; },
                next() { return {value: arr[i], done: i++ >= arr.length} },
            }
        }
        let result = "";
        let e: string;
        for (e of iter()) {
            result += e;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof destructuring with iterator", () => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        function iter(): IterableIterator<[string, string]> {
            let i = 0;
            return {
                [Symbol.iterator]() { return this; },
                next() { return {value: [i.toString(), arr[i]], done: i++ >= arr.length} },
            }
        }
        let result = "";
        for (let [a, b] of iter()) {
            result += a + b;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof destructuring with iterator and existing variables", () => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        function iter(): IterableIterator<[string, string]> {
            let i = 0;
            return {
                [Symbol.iterator]() { return this; },
                next() { return {value: [i.toString(), arr[i]], done: i++ >= arr.length} },
            }
        }
        let result = "";
        let a: string;
        let b: string;
        for ([a, b] of iter()) {
            result += a + b;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof array which modifies length", () => {
    util.testFunction`
        const arr = ["a", "b", "c"];
        let result = "";
        for (const v of arr) {
            if (v === "a") {
                arr.push("d");
            }
            result += v;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof nested destructuring", () => {
    util.testFunction`
        let result = 0;
        for (const [[x]] of [[[1]]]) {
            result = x;
        }
        return result;
    `.expectToMatchJsResult();
});

test("forof with array typed as iterable", () => {
    util.testFunction`
        function foo(): Iterable<string> {
            return ["A", "B", "C"];
        }
        let result = "";
        for (const x of foo()) {
            result += x;
        }
        return result;
    `.expectToMatchJsResult();
});

test.each(["", "abc", "a\0c"])("forof string (%p)", string => {
    util.testFunctionTemplate`
        const results: string[] = [];
        for (const x of ${string}) {
            results.push(x);
        }
        return results;
    `.expectToMatchJsResult();
});

describe("for...of empty destructuring", () => {
    const declareTests = (destructuringPrefix: string) => {
        test("array", () => {
            util.testFunction`
                const arr = [["a"], ["b"], ["c"]];
                let i = 0;
                for (${destructuringPrefix}[] of arr) {
                    ++i;
                }
                return i;
            `.expectToMatchJsResult();
        });

        test("iterable", () => {
            util.testFunction`
                const iter: Iterable<string[]> = [["a"], ["b"], ["c"]];
                let i = 0;
                for (${destructuringPrefix}[] of iter) {
                    ++i;
                }
                return i;
            `.expectToMatchJsResult();
        });
    };

    describe("declaration", () => {
        declareTests("const ");
    });
    describe("assignment", () => {
        declareTests("");
    });
});

for (const testCase of [
    "while (false) { continue; }",
    "do { continue; } while (false)",
    "for (;;) { continue; }",
    "for (const a in {}) { continue; }",
    "for (const a of []) { continue; }",
]) {
    const expectContinueGotoLabel: util.TapCallback = builder =>
        expect(builder.getMainLuaCodeChunk()).toMatch("::__continue2::");

    util.testEachVersion(`loop continue (${testCase})`, () => util.testModule(testCase), {
        [tstl.LuaTarget.Universal]: builder => builder.expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]),
        [tstl.LuaTarget.Lua50]: builder => builder.expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]),
        [tstl.LuaTarget.Lua51]: builder => builder.expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]),
        [tstl.LuaTarget.Lua52]: expectContinueGotoLabel,
        [tstl.LuaTarget.Lua53]: expectContinueGotoLabel,
        [tstl.LuaTarget.Lua54]: expectContinueGotoLabel,
        [tstl.LuaTarget.LuaJIT]: expectContinueGotoLabel,
    });
}

test("do...while", () => {
    util.testFunction`
        let result = 0;
        do {
            ++result;
        } while (result < 2);
        return result;
    `.expectToMatchJsResult();
});

test("do...while scoping", () => {
    util.testFunction`
        let x = 0;
        let result = 0;
        do {
            let x = 1;
            ++result;
        } while (x === 0 && result < 2);
        return result;
    `.expectToMatchJsResult();
});

test("do...while double-negation", () => {
    const builder = util.testFunction`
        let result = 0;
        do {
            ++result;
        } while (!(result >= 2));
        return result;
    `.expectToMatchJsResult();

    expect(builder.getMainLuaCodeChunk()).not.toMatch("not");
});

test("for...in with pre-defined variable", () => {
    const testBuilder = util.testFunction`
        const obj = { x: "y", foo: "bar" };

        let x = "";
        let result = [];
        for (x in obj) {
            result.push(x);
        }
        return result;
    `;
    // Need custom matcher because order is not guaranteed in neither JS nor Lua
    expect(testBuilder.getJsExecutionResult()).toEqual(expect.arrayContaining(testBuilder.getLuaExecutionResult()));
});

test("for...in with pre-defined variable keeps last value", () => {
    const keyX = "x";
    const keyFoo = "foo";

    const result = util.testFunction`
        const obj = { ${keyX}: "y", ${keyFoo}: "bar" };

        let x = "";
        for (x in obj) {
        }
        return x;
    `.getLuaExecutionResult();
    // Need custom matcher because order is not guaranteed in neither JS nor Lua
    expect([keyX, keyFoo]).toContain(result);
});
