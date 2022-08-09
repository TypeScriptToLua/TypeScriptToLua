import * as util from "../../util";
import { invalidMultiIterableWithoutDestructuring } from "../../../src/transformation/utils/diagnostics";

describe("simple LuaIterable", () => {
    const testIterable = `
    function testIterable(this: void): LuaIterable<string> {
        const strs = ["a", "b", "c"];
        let i = 0;
        return (() => strs[i++]) as any;
    }
    `;
    const testResults = ["a", "b", "c"];

    test("const control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            for (const s of testIterable()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("let control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            for (let s of testIterable()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            let s: string;
            for (s of testIterable()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("function forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { return testIterable(); }
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("function indirect forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { const iter = testIterable(); return iter; }
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("arrow function forward", () => {
        util.testFunction`
            ${testIterable}
            const forward = () => testIterable();
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("manual use", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            const iter = testIterable();
            while (true) {
                const val = iter();
                if (!val) {
                    break;
                }
                results.push(val);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });
});

describe("LuaIterable using state", () => {
    const testIterable = `
    function iterator(this: void, strs: string[], lastStr: string) {
        return strs[strs.indexOf(lastStr) + 1];
    }
    const testIterable = (() => $multi(iterator, ["a", "b", "c"], "")) as (() => LuaIterable<string, string[]>);
    `;
    const testResults = ["a", "b", "c"];

    test("const control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            for (const s of testIterable()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("let control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            for (let s of testIterable()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            let s: string;
            for (s of testIterable()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("function forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { return testIterable(); }
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("function indirect forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { const iter = testIterable(); return iter; }
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("arrow function forward", () => {
        util.testFunction`
            ${testIterable}
            const forward = () => testIterable();
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("manual use", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            let [iter, state, val] = testIterable();
            while (true) {
                val = iter(state, val);
                if (!val) {
                    break;
                }
                results.push(val);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });
});

describe("LuaIterable with array value type", () => {
    const testIterable = `
    function testIterable(this: void): LuaIterable<string[]> {
        const strsArray = [["a1", "a2"], ["b1", "b2"], ["c1", "c2"]];
        let i = 0;
        return (() => strsArray[i++]) as any;
    }
    `;
    const testResults = [
        ["a1", "a2"],
        ["b1", "b2"],
        ["c1", "c2"],
    ];

    test("basic destructuring", () => {
        util.testFunction`
            ${testIterable}
            const results = [];
            for (const [x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure with external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results = []
            let x: string, y: string;
            for ([x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure with function forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { return testIterable(); }
            const results: Array<string[]> = [];
            for (const [x, y] of forward()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure with function indirect forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { const iter = testIterable(); return iter; }
            const results: Array<string[]> = [];
            for (const [x, y] of forward()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure arrow function forward", () => {
        util.testFunction`
            ${testIterable}
            const forward = () => testIterable();
            const results: Array<string[]> = [];
            for (const [x, y] of forward()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("manual use", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
            const iter = testIterable();
            while (true) {
                const val = iter();
                if (!val) {
                    break;
                }
                results.push(val);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });
});

describe("LuaIterable with LuaMultiReturn value type", () => {
    const testIterable = `
    function testIterable(this: void): LuaIterable<LuaMultiReturn<[string, {a: string}]>> {
        const strsArray = [["a1", {a: "a"}], ["b1", {a: "b"}], ["c1", {a: "c"}]];
        let i = 0;
        return (() => {
            const strs = strsArray[i++];
            if (strs) {
                return $multi(...strs);
            }
        }) as any;
    }
    `;
    const testResults = [
        ["a1", { a: "a" }],
        ["b1", { a: "b" }],
        ["c1", { a: "c" }],
    ];

    test("basic destructuring", () => {
        util.testFunction`
            ${testIterable}
            const results = [];
            for (const [x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure with external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results = [];
            let x: string, y: any;
            for ([x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure with function forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { return testIterable(); }
            const results = [];
            for (const [x, y] of forward()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure with function indirect forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { const iter = testIterable(); return iter; }
            const results = [];
            for (const [x, y] of forward()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure arrow function forward", () => {
        util.testFunction`
            ${testIterable}
            const forward = () => testIterable();
            const results = [];
            for (const [x, y] of forward()) {
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("destructure manual use", () => {
        util.testFunction`
            ${testIterable}
            const results = [];
            const iter = testIterable();
            while (true) {
                const [x, y] = iter();
                if (!x) {
                    break;
                }
                results.push([x, y]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("nested destructuring", () => {
        util.testFunction`
            ${testIterable}
            const results = [];
            for (const [x, {a}] of testIterable()) {
                results.push([x, a]);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual([
                ["a1", "a"],
                ["b1", "b"],
                ["c1", "c"],
            ]);
    });

    test.each(["for (const s of testIterable()) {}", "let s; for (s of testIterable()) {}"])(
        "invalid LuaIterable<LuaMultiReturn> without destructuring (%p)",
        statement => {
            util.testFunction`
            ${testIterable}
            ${statement}
        `
                .withLanguageExtensions()
                .expectDiagnosticsToMatchSnapshot([invalidMultiIterableWithoutDestructuring.code]);
        }
    );
});

describe("LuaIterable property", () => {
    const testIterable = `
    class IterableTester {
        public strs = ["a", "b", "c"];

        public get values(): LuaIterable<string> {
            let i = 0;
            return (() => this.strs[i++]) as any;
        }
    }
    const tester = new IterableTester();
    `;
    const testResults = ["a", "b", "c"];

    test("basic usage", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            for (const s of tester.values) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            let s: string;
            for (s of tester.values) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("function forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { return tester.values; }
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("function indirect forward", () => {
        util.testFunction`
            ${testIterable}
            function forward() { const iter = tester.values; return iter; }
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("arrow function forward", () => {
        util.testFunction`
            ${testIterable}
            const forward = () => tester.values;
            const results: string[] = [];
            for (const s of forward()) {
                results.push(s);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });

    test("manual use", () => {
        util.testFunction`
            ${testIterable}
            const results: string[] = [];
            const iter = tester.values;
            while (true) {
                const val = iter();
                if (!val) {
                    break;
                }
                results.push(val);
            }
            return results;
        `
            .withLanguageExtensions()
            .expectToEqual(testResults);
    });
});
