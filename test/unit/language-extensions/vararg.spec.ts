import * as util from "../../util";
import { invalidVarargUse } from "../../../src/transformation/utils/diagnostics";

test.each([
    'const result = [...$vararg].join("")',
    'let result: string; { result = [...$vararg].join(""); }',
    'let result: string; if (true) { result = [...$vararg].join(""); }',
    'let result: string; do { result = [...$vararg].join(""); } while (false);',
    'function foo(...args: unknown[]) { return args.join(""); } const result = foo(...$vararg);',
])("$vararg valid use (%p)", statement => {
    util.testModule`
        ${statement}
        export { result };
    `
        .withLanguageExtensions()
        .setLuaFactory(code => `return (function(...) ${code} end)("A", "B", "C", "D")`)
        .tap(builder => expect(builder.getMainLuaCodeChunk()).not.toMatch("unpack"))
        .expectToEqual({ result: "ABCD" });
});

test.each([
    "const x = $vararg;",
    "for (const x of $vararg) {}",
    "const l = $vararg.length",
    "function f(s: string[]) {} f($vararg);",
    "function foo(...args: string[]) {} function bar() { foo(...$vararg); }",
])("$vararg invalid use (%p)", statement => {
    util.testModule`
        ${statement}
    `
        .withLanguageExtensions()
        .expectDiagnosticsToMatchSnapshot([invalidVarargUse.code]);
});

test("$vararg in bundle entry point", () => {
    util.testModule`
        export const result = [...$vararg].join("");
    `
        .setMainFileName("src/main.ts")
        .setOptions({ rootDir: "src", luaBundle: "bundle.lua", luaBundleEntry: "src/main.ts" })
        .withLanguageExtensions()
        .setLuaFactory(code => `return (function(...) ${code} end)("A", "B", "C", "D")`)
        .expectToEqual({ result: "ABCD" });
});

test("$vararg in bundle sub-module", () => {
    util.testModule`
        export { result } from "./module";
    `
        .setMainFileName("src/main.ts")
        .addExtraFile("src/module.ts", 'export const result = [...$vararg].join("")')
        .setOptions({ rootDir: "src", luaBundle: "bundle.lua", luaBundleEntry: "src/main.ts" })
        .withLanguageExtensions()
        .expectToEqual({ result: "module" });
});
