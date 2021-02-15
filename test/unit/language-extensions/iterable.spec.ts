import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { invalidMultiIterableWithoutDestructuring } from "../../../src/transformation/utils/diagnostics";

const iterableProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

describe("basic LuaIterable", () => {
    const testIterable = `
    function testIterator(this: void, strs: string[], lastStr: string) {
        return strs[strs.indexOf(lastStr) + 1];
    }

    const strs = ["a", "b", "c"];
    const testIterable = (() => $multi(testIterator, strs, "")) as (() => LuaIterable<string, string[]>);
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });
});

describe("LuaIterable with array value type", () => {
    const testIterable = `
    function testIterator(this: void, strsArray: Array<string[]>, lastStrs: string[]) {
        return strsArray[strsArray.indexOf(lastStrs) + 1];
    }

    const strsArray = [["a1", "a2"], ["b1", "b2"], ["c1", "c2"]];
    const testIterable = (() => $multi(testIterator, strsArray, [""])) as (() => LuaIterable<string[], Array<string[]>>);
    `;
    const testResults = [
        ["a1", "a2"],
        ["b1", "b2"],
        ["c1", "c2"],
    ];

    test("basic destructuring", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
            for (const [x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });

    test("destructure with external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
            let x: string, y: string;
            for ([x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });

    test("manual use", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
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
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });
});

describe("LuaIterable with LuaMultiReturn value type", () => {
    const testIterable = `
    function testIterator(this: void, strsArray: Array<string[]>, lastStr: string) {
        const str = strsArray[strsArray.findIndex(strs => strs[0] === lastStr) + 1];
        if (str) {
            return $multi(...str);
        }
    }

    const strsArray = [["a1", "a2"], ["b1", "b2"], ["c1", "c2"]];
    const testIterable = (() => $multi(testIterator, strsArray, "")) as (() => LuaIterable<LuaMultiReturn<string[]>, Array<string[]>>);
    `;
    const testResults = [
        ["a1", "a2"],
        ["b1", "b2"],
        ["c1", "c2"],
    ];

    test("basic destructuring", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
            for (const [x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });

    test("destructure with external control variable", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
            let x: string, y: string;
            for ([x, y] of testIterable()) {
                results.push([x, y]);
            }
            return results;
        `
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
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
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });

    test("destructure manual use", () => {
        util.testFunction`
            ${testIterable}
            const results: Array<string[]> = [];
            let [iter, state, x] = testIterable();
            let y: string;
            while (true) {
                [x, y] = iter(state, x);
                if (!x) {
                    break;
                }
                results.push([x, y]);
            }
            return results;
        `
            .setOptions(iterableProjectOptions)
            .expectToEqual(testResults);
    });

    test.each(["for (const s of testIterable()) {}", "let s; for (s of testIterable()) {}"])(
        "invalid LuaIterable<LuaMultiReturn> without destructuring (%p)",
        statement => {
            util.testFunction`
            ${testIterable}
            ${statement}
        `
                .setOptions(iterableProjectOptions)
                .expectDiagnosticsToMatchSnapshot([invalidMultiIterableWithoutDestructuring.code]);
        }
    );
});
