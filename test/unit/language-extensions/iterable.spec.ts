import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import {
    invalidIterableUse,
    invalidMultiIterableWithoutDestructuring,
} from "../../../src/transformation/utils/diagnostics";

const iterableProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

const testIterable = `
function testIterable(): LuaIterable<string> {
    const strs = ["a", "b", "c"];
    let i = 0;
    function iterator() {
        return strs[i++];
    }
    return iterator as any;
}
`;

const testArrayIterable = `
function testArrayIterable(): LuaIterable<string[]> {
    const strs = [["a1", "a2"], ["b1", "b2"], ["c1", "c2"]];
    let i = 0;
    function iterator() {
        return strs[i++];
    }
    return iterator as any;
}
`;

const testMultiIterable = `
function testMultiIterable(): LuaMultiIterable<[string, string]> {
    const strs = [["a1", "a2"], ["b1", "b2"], ["c1", "c2"]];
    let i = 0;
    function iterator() {
        const j = i++;
        if (strs[j]) {
            return $multi(...strs[j]);
        }
    }
    return iterator as any;
}
`;

const testIterableProperty = `
class IterablePropertyTest {
    public get testIterable(): LuaIterable<string> {
        const strs = ["a", "b", "c"];
        let i = 0;
        function iterator() {
            return strs[i++];
        }
        return iterator as any;
    }
}
const tester = new IterablePropertyTest();
`;

test.each(["const s", "let s"])("LuaIterable basic use", initializer => {
    util.testFunction`
        ${testIterable}
        const results: string[] = [];
        for (${initializer} of testIterable()) {
            results.push(s);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a", "b", "c"]);
});

test("LuaIterable with external control variable", () => {
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
        .expectToEqual(["a", "b", "c"]);
});

test.each(["const [x, y]", "let [x, y]"])("LuaIterable array destructuring", initializer => {
    util.testFunction`
        ${testArrayIterable}
        const results: string[] = [];
        for (${initializer} of testArrayIterable()) {
            results.push(x);
            results.push(y);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
});

test("LuaIterable array destructuring with external control variable", () => {
    util.testFunction`
        ${testArrayIterable}
        const results: string[] = [];
        let x: string, y: string;
        for ([x, y] of testArrayIterable()) {
            results.push(x);
            results.push(y);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
});

test.each(["const [x, y]", "let [x, y]"])("LuaMultiIterable basic use", initializer => {
    util.testFunction`
        ${testMultiIterable}
        const results: string[] = [];
        for (${initializer} of testMultiIterable()) {
            results.push(x);
            results.push(y);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
});

test("LuaMultiIterable with external control variables", () => {
    util.testFunction`
        ${testMultiIterable}
        const results: string[] = [];
        let x: string, y: string;
        for ([x, y] of testMultiIterable()) {
            results.push(x);
            results.push(y);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
});

test.each([".testIterable", '["testIterable"]'])("LuaIterable property", access => {
    util.testFunction`
        ${testIterableProperty}
        const results: string[] = [];
        for (const s of tester${access}) {
            results.push(s);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a", "b", "c"]);
});

function makeForwardTests(call: string, code: string) {
    return [`${code} function forward() { return ${call}; }`, `${code} const forward = () => ${call};`];
}

test.each(
    [
        ["testIterable()", testIterable],
        ["tester.testIterable", testIterableProperty],
    ].map(([call, code]) => makeForwardTests(call, code))
)("LuaIterable return forward", forwardFunction => {
    util.testFunction`
        ${forwardFunction}
        const results: string[] = [];
        for (const s of forward()) {
            results.push(s);
        }
        return results;
    `
        .setOptions(iterableProjectOptions)
        .expectToEqual(["a", "b", "c"]);
});

test.each(makeForwardTests("testMultiIterable()", testMultiIterable))(
    "LuaMultiIterable return forward",
    forwardFunction => {
        util.testFunction`
        ${forwardFunction}
        const results: string[] = [];
        for (const [x, y] of forward()) {
            results.push(x);
            results.push(y);
        }
        return results;
    `
            .setOptions(iterableProjectOptions)
            .expectToEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
    }
);

test.each(
    [
        ["testIterable()", testIterable],
        ["testMultiIterable()", testMultiIterable],
        ["tester.testIterable", testIterableProperty],
    ].flatMap(
        ([call, code]): Array<[string, string]> => [
            [`for (const s in ${call}) {}`, code],
            [`const i = ${call};`, code],
            [`function foo(i: any) {} foo(${call});`, code],
        ]
    )
)("invalid use of LuaIterable (%p)", (statement, code) => {
    util.testFunction`
        ${code}
        ${statement}
    `
        .setOptions(iterableProjectOptions)
        .expectToHaveDiagnostics([invalidIterableUse.code]);
});

test.each(["for (const s of testMultiIterable()) {}", "let s; for (s of testMultiIterable()) {}"])(
    "invalid LuaMultiIterable without destructuring (%p)",
    statement => {
        util.testFunction`
        ${testMultiIterable}
        ${statement}
    `
            .setOptions(iterableProjectOptions)
            .expectToHaveDiagnostics([invalidMultiIterableWithoutDestructuring.code]);
    }
);
