import * as path from "path";
import * as util from "../../util";

test("ignore language service plugins", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ plugins: [{ name: path.join(__dirname, "types.ts") }] })
        .expectToEqual(false);
});

test("default type", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ plugins: [{ transform: path.join(__dirname, "fixtures.ts"), import: "program", value: true }] })
        .expectToEqual(true);
});

test("transformer resolution error", () => {
    util.testModule``
        .setOptions({ plugins: [{ transform: path.join(__dirname, "error.ts") }] })
        .expectToHaveDiagnostics();
});

// This tests plugin transformers by transforming the `return false` statement to a `return true` statement.
describe("factory types", () => {
    test.each(["program", "config", "checker", "raw", "compilerOptions"] as const)("%s", type => {
        util.testFunction`
            return false;
        `
            .setOptions({
                plugins: [{ transform: path.join(__dirname, "fixtures.ts"), type, import: type, value: true }],
            })
            .expectToEqual(true);
    });
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1464
test("transformer with switch does not break (#1464)", () => {
    util.testFunction`
        const foo: number = 3;
        switch (foo) {
            case 2: {
                return 10;
            }
            case 3: {
                return false;
            }
        }
    `
        .setOptions({
            plugins: [{ transform: path.join(__dirname, "fixtures.ts"), import: "program", value: true }],
        })
        .expectToEqual(true);
});
