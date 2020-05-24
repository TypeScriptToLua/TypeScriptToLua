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
