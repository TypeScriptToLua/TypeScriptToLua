import * as ts from "typescript";
import * as tstl from "../../src";
import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("while (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        let i = 0;
        while (i < arrTest.length) {
            arrTest[i] = arrTest[i] + 1;
            i++;
        }
        return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3, 4], expected: [0, 1, 2, 1, 4] }])("while with continue (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
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
            return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3, 4], expected: [0, 1, 2, 1, 4] }])("dowhile with continue (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
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
            return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("for (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        for (let i = 0; i < arrTest.length; ++i) {
            arrTest[i] = arrTest[i] + 1;
        }
        return JSONStringify(arrTest);`
    );
    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("for with expression (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
            let i: number;
            for (i = 0 * 1; i < arrTest.length; ++i) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
    );
    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3, 4], expected: [0, 0, 2, 0, 4] }])("for with continue (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
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
            return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("forMirror (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
            for (let i = 0; arrTest.length > i; i++) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3], expected: [0, 1, 2, 3] }])("forBreak (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
        for (let i = 0; i < arrTest.length; ++i) {
            break;
            arrTest[i] = arrTest[i] + 1;
        }
        return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("forNoDeclarations (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
            let i = 0;
            for (; i < arrTest.length; ++i) {
                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [0, 1, 2, 3], expected: [1, 2, 3, 4] }])("forNoCondition (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let arrTest = ${JSON.stringify(inp)};
            let i = 0;
            for (;; ++i) {
                if (i >= arrTest.length) {
                    break;
                }

                arrTest[i] = arrTest[i] + 1;
            }
            return JSONStringify(arrTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test("forNoPostExpression (%p)", () => {
    util.fn`
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
    util.fn`
        let arrTest = ${JSON.stringify(inp)};
        for (${header}) {
            arrTest[i] = arrTest[i] + 1;
        }
        return arrTest;
    `.expectToMatchJsResult();
});

test("for scope", () => {
    util.fn`
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
    ).toThrowExactError(TSTLErrors.ForbiddenForIn(util.nodeStub));
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

test.each([{ inp: [0, 1, 2], expected: [1, 2, 3] }])("forof existing variable (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let objTest = ${JSON.stringify(inp)};
            let arrResultTest = [];
            let value: number;
            for (value of objTest) {
                arrResultTest.push(value + 1)
            }
            return JSONStringify(arrResultTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [[1, 2], [2, 3], [3, 4]], expected: [3, 5, 7] }])("forof destructing (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let objTest = ${JSON.stringify(inp)};
            let arrResultTest = [];
            for (let [a,b] of objTest) {
                arrResultTest.push(a + b)
            }
            return JSONStringify(arrResultTest);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test.each([{ inp: [[1, 2], [2, 3], [3, 4]], expected: [3, 5, 7] }])(
    "forof destructing with existing variables (%p)",
    ({ inp, expected }) => {
        const result = util.transpileAndExecute(
            `let objTest = ${JSON.stringify(inp)};
            let arrResultTest = [];
            let a: number;
            let b: number;
            for ([a,b] of objTest) {
                arrResultTest.push(a + b)
            }
            return JSONStringify(arrResultTest);`
        );

        expect(result).toBe(JSON.stringify(expected));
    }
);

test.each([{ inp: [0, 1, 2, 3, 4], expected: [0, 0, 2, 0, 4] }])("forof with continue (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let testArr = ${JSON.stringify(inp)};
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
            return JSONStringify(testArr);`
    );

    expect(result).toBe(JSON.stringify(expected));
});

test("forof with iterator", () => {
    const code = `
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
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("abc");
});

test("forof with iterator and existing variable", () => {
    const code = `
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
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("abc");
});

test("forof destructuring with iterator", () => {
    const code = `
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
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof destructuring with iterator and existing variables", () => {
    const code = `
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
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof array which modifies length", () => {
    const code = `
        const arr = ["a", "b", "c"];
        let result = "";
        for (const v of arr) {
            if (v === "a") {
                arr.push("d");
            }
            result += v;
        }
        return result;`;

    expect(util.transpileAndExecute(code)).toBe("abcd");
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
        TSTLErrors.UnsupportedObjectDestructuringInForOf(ts.createEmptyStatement()).message
    );
});

test("forof with array typed as iterable", () => {
    const code = `
        function foo(): Iterable<string> {
            return ["A", "B", "C"];
        }
        let result = "";
        for (const x of foo()) {
            result += x;
        }
        return result;
    `;
    expect(util.transpileAndExecute(code)).toBe("ABC");
});

test("forof lua iterator", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        for (let e of luaIter()) { result += e; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("abc");
});

test("forof array lua iterator", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Array<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        for (let e of luaIter()) { result += e; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("abc");
});

test("forof lua iterator with existing variable", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i++]) as any;
        }
        let result = "";
        let e: string;
        for (e of luaIter()) { result += e; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("abc");
});

test("forof lua iterator destructuring", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i] && [i.toString(), arr[i++]]) as any;
        }
        let result = "";
        for (let [a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator destructuring with existing variables", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            return (() => arr[i] && [i.toString(), arr[i++]]) as any;
        }
        let result = "";
        let a: string;
        let b: string;
        for ([a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        /** @tupleReturn */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            /** @tupleReturn */
            function iter() { return arr[i] && [i.toString(), arr[i++]] || []; }
            return iter as any;
        }
        let result = "";
        for (let [a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return with existing variables", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        /** @tupleReturn */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            /** @tupleReturn */
            function iter() { return arr[i] && [i.toString(), arr[i++]] || []; }
            return iter as any;
        }
        let result = "";
        let a: string;
        let b: string;
        for ([a, b] of luaIter()) { result += a + b; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
});

test("forof lua iterator tuple-return single variable", () => {
    const code = `
        /** @luaIterator */
        /** @tupleReturn */
        interface Iter extends Iterable<[string, string]> {}
        declare function luaIter(): Iter;
        for (let x of luaIter()) {}
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    expect(() => util.transpileString(code, compilerOptions)).toThrowExactError(
        TSTLErrors.UnsupportedNonDestructuringLuaIterator(util.nodeStub)
    );
});

test("forof lua iterator tuple-return single existing variable", () => {
    const code = `
        /** @luaIterator */
        /** @tupleReturn */
        interface Iter extends Iterable<[string, string]> {}
        declare function luaIter(): Iter;
        let x: [string, string];
        for (x of luaIter()) {}
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    expect(() => util.transpileString(code, compilerOptions)).toThrowExactError(
        TSTLErrors.UnsupportedNonDestructuringLuaIterator(util.nodeStub)
    );
});

test("forof forwarded lua iterator", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        interface Iter extends Iterable<string> {}
        function luaIter(): Iter {
            let i = 0;
            function iter() { return arr[i++]; }
            return iter as any;
        }
        function forward() {
            const iter = luaIter();
            return iter;
        }
        let result = "";
        for (let a of forward()) { result += a; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("abc");
});

test("forof forwarded lua iterator with tupleReturn", () => {
    const code = `
        const arr = ["a", "b", "c"];
        /** @luaIterator */
        /** @tupleReturn */
        interface Iter extends Iterable<[string, string]> {}
        function luaIter(): Iter {
            let i = 0;
            /** @tupleReturn */
            function iter() { return arr[i] && [i.toString(), arr[i++]] || []; }
            return iter as any;
        }
        function forward() {
            const iter = luaIter();
            return iter;
        }
        let result = "";
        for (let [a, b] of forward()) { result += a + b; }
        return result;
    `;
    const compilerOptions = {
        luaLibImport: tstl.LuaLibImportKind.Require,
        luaTarget: tstl.LuaTarget.Lua53,
        target: ts.ScriptTarget.ES2015,
    };
    const result = util.transpileAndExecute(code, compilerOptions);
    expect(result).toBe("0a1b2c");
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
        TSTLErrors.UnsupportedForTarget("Continue statement", tstl.LuaTarget.Lua51, ts.createContinue())
    );
    expect(util.transpileString(loop, lua52).indexOf("::__continue1::") !== -1).toBe(true);
    expect(util.transpileString(loop, lua53).indexOf("::__continue1::") !== -1).toBe(true);
    expect(util.transpileString(loop, luajit).indexOf("::__continue1::") !== -1).toBe(true);
});

test("for dead code after return", () => {
    const result = util.transpileAndExecute(`for (let i = 0; i < 10; i++) { return 3; const b = 8; }`);

    expect(result).toBe(3);
});

test("for..in dead code after return", () => {
    const result = util.transpileAndExecute(`for (let a in {"a": 5, "b": 8}) { return 3; const b = 8; }`);

    expect(result).toBe(3);
});

test("for..of dead code after return", () => {
    const result = util.transpileAndExecute(`for (let a of [1,2,4]) { return 3; const b = 8; }`);

    expect(result).toBe(3);
});

test("while dead code after return", () => {
    const result = util.transpileAndExecute(`while (true) { return 3; const b = 8; }`);

    expect(result).toBe(3);
});
