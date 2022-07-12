import * as util from "../../util";
import { invalidPairsIterableWithoutDestructuring } from "../../../src/transformation/utils/diagnostics";
import { LuaTarget } from "../../../src";

const testIterable = `
const testIterable = {a1: "a2", b1: "b2", c1: "c2"} as unknown as LuaPairsIterable<string, string>;
`;

const testResults = {
    a1: "a2",
    b1: "b2",
    c1: "c2",
};

test("pairs iterable", () => {
    util.testFunction`
        ${testIterable}
        const results: Record<string, string> = {};
        for (const [k, v] of testIterable) {
            results[k] = v;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual(testResults);
});

test("pairs iterable with external control variable", () => {
    util.testFunction`
        ${testIterable}
        const results: Record<string, string> = {};
        let k: string, v: string;
        for ([k, v] of testIterable) {
            results[k] = v;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual(testResults);
});

test("pairs iterable function forward", () => {
    util.testFunction`
        ${testIterable}
        function forward() { return testIterable; }
        const results: Record<string, string> = {};
        for (const [k, v] of forward()) {
            results[k] = v;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual(testResults);
});

test("pairs iterable function indirect forward", () => {
    util.testFunction`
        ${testIterable}
        function forward() { const iter = testIterable; return iter; }
        const results: Record<string, string> = {};
        for (const [k, v] of forward()) {
            results[k] = v;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual(testResults);
});

test("pairs iterable arrow function forward", () => {
    util.testFunction`
        ${testIterable}
        const forward = () => testIterable;
        const results: Record<string, string> = {};
        for (const [k, v] of forward()) {
            results[k] = v;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual(testResults);
});

test("pairs iterable with __pairs metamethod", () => {
    util.testFunction`
        class PairsTest  {
            __pairs() {
                const kvp = [ ["a1", "a2"], ["b1", "b2"], ["c1", "c2"] ];
                let i = 0;
                return () => {
                    if (i < kvp.length) {
                        const [k, v] = kvp[i++];
                        return $multi(k, v);
                    }
                };
            }
        }
        const tester = new PairsTest() as PairsTest & LuaPairsIterable<string, string>;
        const results: Record<string, string> = {};
        for (const [k, v] of tester) {
            results[k] = v;
        }
        return results;
    `
        .withLanguageExtensions()
        .setOptions({ luaTarget: LuaTarget.Lua53 })
        .expectToEqual(testResults);
});

test.each(["for (const s of testIterable) {}", "let s; for (s of testIterable) {}"])(
    "invalid LuaPairsIterable without destructuring (%p)",
    statement => {
        util.testFunction`
        ${testIterable}
        ${statement}
    `
            .withLanguageExtensions()
            .expectDiagnosticsToMatchSnapshot([invalidPairsIterableWithoutDestructuring.code]);
    }
);

const testKeyIterable = `
const testKeyIterable = {a1: true, b1: true, c1: true} as unknown as LuaPairsKeyIterable<string>;
`;

test("pairs key iterable", () => {
    util.testFunction`
        ${testKeyIterable}
        const results: Record<string, boolean> = {};
        for (const k of testKeyIterable) {
            results[k] = true;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual({ a1: true, b1: true, c1: true });
});

test("pairs key iterable with external control variable", () => {
    util.testFunction`
        ${testKeyIterable}
        const results: Record<string, boolean> = {};
        let k: string;
        for (k of testKeyIterable) {
            results[k] = true;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual({ a1: true, b1: true, c1: true });
});

test("pairs key iterable function forward", () => {
    util.testFunction`
        ${testKeyIterable}
        function forward() { return testKeyIterable; }
        const results: Record<string, boolean> = {};
        for (const k of forward()) {
            results[k] = true;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual({ a1: true, b1: true, c1: true });
});

test("pairs key iterable function indirect forward", () => {
    util.testFunction`
        ${testKeyIterable}
        function forward() { const iter = testKeyIterable; return iter; }
        const results: Record<string, boolean> = {};
        for (const k of forward()) {
            results[k] = true;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual({ a1: true, b1: true, c1: true });
});

test("pairs key iterable arrow function forward", () => {
    util.testFunction`
        ${testKeyIterable}
        const forward = () => testKeyIterable;
        const results: Record<string, boolean> = {};
        for (const k of forward()) {
            results[k] = true;
        }
        return results;
    `
        .withLanguageExtensions()
        .expectToEqual({ a1: true, b1: true, c1: true });
});

test("pairs key iterable with __pairs metamethod", () => {
    util.testFunction`
        class PairsTest  {
            __pairs() {
                const kvp = [ ["a1", true], ["b1", true], ["c1", true] ];
                let i = 0;
                return () => {
                    if (i < kvp.length) {
                        const [k, v] = kvp[i++];
                        return $multi(k, v);
                    }
                };
            }
        }
        const tester = new PairsTest() as PairsTest & LuaPairsKeyIterable<string>;
        const results: Record<string, boolean> = {};
        for (const k of tester) {
            results[k] = true;
        }
        return results;
    `
        .withLanguageExtensions()
        .setOptions({ luaTarget: LuaTarget.Lua53 })
        .expectToEqual({ a1: true, b1: true, c1: true });
});
