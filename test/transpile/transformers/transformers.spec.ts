import * as path from "path";
import * as tstl from "../../../src";
import * as util from "../../util";

test("should ignore language service plugins", () => {
    util.testFunction`
        return;
    `
        .setOptions({ plugins: [{ name: path.join(__dirname, "resolve.ts") }] })
        .expectToEqual(undefined);
});

describe("resolution", () => {
    const testTransform = (transformer: tstl.TransformerImport) => {
        util.testFunction`
            return;
        `
            .setOptions({ plugins: [transformer] })
            .expectToEqual(true);
    };

    test("resolve relative transformer paths", () => {
        jest.spyOn(process, "cwd").mockReturnValue(__dirname);
        testTransform({ transform: "./resolve.ts" });
    });

    test("load .js transformers", () => {
        testTransform({ transform: path.join(__dirname, "resolve.js") });
    });

    test("load .ts transformers", () => {
        testTransform({ transform: path.join(__dirname, "resolve.ts") });
    });

    test('"import" option', () => {
        testTransform({ transform: path.join(__dirname, "import.ts"), import: "transformer" });
    });

    test("error if transformer could not be resolved", () => {
        util.testModule``
            .setOptions({ plugins: [{ transform: path.join(__dirname, "error.ts") }] })
            .expectToHaveDiagnostics();
    });
});

describe("factory types", () => {
    for (const type of ["program", "config", "checker", "raw", "compilerOptions"] as const) {
        test(type, () => {
            util.testFunction`
                return false;
            `
                .setOptions({
                    plugins: [{ transform: path.join(__dirname, "types.ts"), type, import: type, value: true }],
                })
                .expectToEqual(true);
        });
    }
});
