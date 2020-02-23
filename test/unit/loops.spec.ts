import * as ts from "typescript";
import * as tstl from "../../src";
import {
    ForbiddenForIn,
    UnsupportedForTarget,
    UnsupportedObjectDestructuringInForOf,
} from "../../src/transformation/utils/errors";
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
        inp: { ["test1"]: 0, ["test2"]: 1, ["test3"]: 2 },
        expected: { ["test1"]: 1, ["test2"]: 2, ["test3"]: 3 },
    },
])("forin[Object] (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let objTest = ${JSON.stringify(inp)};
        for (let key in objTest) {
            objTest[key] = objTest[key] + 1;
        }
        return JSONStringify(objTest);`
    );

    expect(JSON.parse(result)).toEqual(expected);
});

test.each([{ inp: [1, 2, 3] }])("forin[Array] (%p)", ({ inp }) => {
    expect(() =>
        util.transpileString(
            `let arrTest = ${JSON.stringify(inp)};
            for (let key in arrTest) {
                arrTest[key]++;
            }`
        )
    ).toThrowExactError(ForbiddenForIn(util.nodeStub));
});

test.each([{ inp: { a: 0, b: 1, c: 2, d: 3, e: 4 }, expected: { a: 0, b: 0, c: 2, d: 0, e: 4 } }])(
    "forin with continue (%p)",
    ({ inp, expected }) => {
        const result = util.transpileAndExecute(
            `let obj = ${JSON.stringify(inp)};
            for (let i in obj) {
                if (obj[i] % 2 == 0) {
                    continue;
                }

                obj[i] = 0;
            }
            return JSONStringify(obj);`
        );

        expect(result).toBe(JSON.stringify(expected));
    }
);

test.each([{ inp: [0, 1, 2], expected: [1, 2, 3] }])("forof (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let objTest = ${JSON.stringify(inp)};
        let arrResultTest = [];
        for (let value of objTest) {
            arrResultTest.push(value + 1)
        }
        return JSONStringify(arrResultTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
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

test.each([
    { initializer: "const {a, b}", vars: "" },
    { initializer: "const {a: x, b: y}", vars: "" },
    { initializer: "{a, b}", vars: "let a: string, b: string;" },
    { initializer: "{a: c, b: d}", vars: "let c: string, d: string;" },
])("forof object destructuring (%p)", ({ initializer, vars }) => {
    const code = `
        declare const arr: {a: string, b: string}[];
        ${vars}
        for (${initializer} of arr) {}`;

    expect(() => util.transpileString(code)).toThrow(
        UnsupportedObjectDestructuringInForOf(ts.createEmptyStatement()).message
    );
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

describe("for...of empty destructuring", () => {
    const declareTests = (destructuringPrefix: string) => {
        test("array", () => {
            const code = `
                const arr = [["a"], ["b"], ["c"]];
                let i = 0;
                for (${destructuringPrefix}[] of arr) {
                    ++i;
                }
                return i;
            `;
            expect(util.transpileAndExecute(code)).toBe(3);
        });

        test("iterable", () => {
            const code = `
                const iter: Iterable<string[]> = [["a"], ["b"], ["c"]];
                let i = 0;
                for (${destructuringPrefix}[] of iter) {
                    ++i;
                }
                return i;
            `;
            expect(util.transpileAndExecute(code)).toBe(3);
        });

        test("luaIterator", () => {
            const code = `
                const arr = [["a"], ["b"], ["c"]];
                /** @luaIterator */
                interface Iter extends Iterable<string[]> {}
                function luaIter(): Iter {
                    let it = 0;
                    return (() => arr[it++]) as any;
                }
                let i = 0;
                for (${destructuringPrefix}[] of luaIter()) {
                    ++i;
                }
                return i;
            `;
            expect(util.transpileAndExecute(code)).toBe(3);
        });

        test("luaIterator+tupleReturn", () => {
            const code = `
                const arr = [["a", "b"], ["c", "d"], ["e", "f"]];
                /**
                 * @luaIterator
                 * @tupleReturn
                 */
                interface Iter extends Iterable<[string, string]> {}
                function luaIter(): Iter {
                    let it = 0;
                    /** @tupleReturn */
                    function iter() {
                        const e = arr[it++];
                        if (e) {
                            return e;
                        }
                    }
                    return iter as any;
                }
                let i = 0;
                for (${destructuringPrefix}[] of luaIter()) {
                    ++i;
                }
                return i;
            `;
            expect(util.transpileAndExecute(code)).toBe(3);
        });
    };

    describe("declaration", () => declareTests("const "));
    describe("assignment", () => declareTests(""));
});

test.each([
    "while (a < b) { i++; continue; }",
    "do { i++; continue; } while (a < b)",
    "for (let i = 0; i < 3; i++) { continue; }",
    "for (let a in b) { continue; }",
    "for (let a of b) { continue; }",
])("loop continue in different lua versions (%p)", loop => {
    const lua51 = { luaTarget: tstl.LuaTarget.Lua51 };
    const lua52 = { luaTarget: tstl.LuaTarget.Lua52 };
    const lua53 = { luaTarget: tstl.LuaTarget.Lua53 };
    const luajit = { luaTarget: tstl.LuaTarget.LuaJIT };

    expect(() => util.transpileString(loop, lua51)).toThrowExactError(
        UnsupportedForTarget("Continue statement", tstl.LuaTarget.Lua51, ts.createContinue())
    );
    expect(util.transpileString(loop, lua52).indexOf("::__continue2::") !== -1).toBe(true);
    expect(util.transpileString(loop, lua53).indexOf("::__continue2::") !== -1).toBe(true);
    expect(util.transpileString(loop, luajit).indexOf("::__continue2::") !== -1).toBe(true);
});

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
    util.testFunction`
        const obj = { x: "y", foo: "bar" };

        let x = "";
        let result = [];
        for (x in obj) {
            result.push(x);
        }
        return result;
    `.expectToMatchJsResult();
});

test("for...in with pre-defined variable keeps last value", () => {
    util.testFunction`
        const obj = { x: "y", foo: "bar" };

        let x = "";
        for (x in obj) {
        }
        return x;
    `.expectToMatchJsResult();
});
