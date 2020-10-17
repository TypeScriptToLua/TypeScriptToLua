import * as util from "../util";
import { resolveFixture } from "./run";

const transformersFixture = resolveFixture("transformers.ts");

test("ignore language service plugins", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ plugins: [{ name: transformersFixture }] })
        .expectToEqual(false);
});

test("default type", () => {
    util.testFunction`
        return false;
    `
        .setOptions({ plugins: [{ transform: transformersFixture, import: "program", value: true }] })
        .expectToEqual(true);
});

test("transformer resolution error", () => {
    util.testModule``
        .setOptions({ plugins: [{ transform: resolveFixture("transformers/error.ts") }] })
        .expectToHaveDiagnostics();
});

describe("factory types", () => {
    test.each(["program", "config", "checker", "raw", "compilerOptions"] as const)("%s", type => {
        util.testFunction`
            return false;
        `
            .setOptions({ plugins: [{ transform: transformersFixture, type, import: type, value: true }] })
            .expectToEqual(true);
    });
});
