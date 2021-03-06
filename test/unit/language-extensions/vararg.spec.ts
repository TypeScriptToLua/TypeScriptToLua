import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { invalidVarargUse } from "../../../src/transformation/utils/diagnostics";

const varargProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

test.each([
    'const result = [...$vararg].join("")',
    'let result: string; { result = [...$vararg].join(""); }',
    'let result: string; if (true) { result = [...$vararg].join(""); }',
    'let result: string; do { result = [...$vararg].join(""); } while (false);',
])("$vararg valid use (%p)", statement => {
    util.testModule`
        ${statement}
        export { result };
    `
        .setOptions(varargProjectOptions)
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
        .setOptions(varargProjectOptions)
        .expectDiagnosticsToMatchSnapshot([invalidVarargUse.code]);
});
