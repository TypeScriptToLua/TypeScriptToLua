import * as path from "path";
import * as tstl from "../../src";
import * as util from "../util";

const testTransform = (transform: string) => {
    const options: tstl.CompilerOptions = { tsTransformers: [{ transform }] };
    expect(util.transpileAndExecute("return", options)).toBe(true);
};

test("should resolve relative transformer paths", () => {
    jest.spyOn(process, "cwd").mockReturnValue(__dirname);
    testTransform("./transformers/resolve.ts");
});

test("should load js transformers", () => {
    testTransform(path.join(__dirname, "transformers/resolve.js"));
});

test("should load ts transformers", () => {
    testTransform(path.join(__dirname, "transformers/resolve.ts"));
});

test("should pass program to transformers", () => {
    const transform = path.join(__dirname, "transformers/program.ts");
    const options: tstl.CompilerOptions = { tsTransformers: [{ transform }] };

    expect(util.transpileAndExecute("return false", options)).toBe(true);
});

test("should pass extra options to transformers", () => {
    const transform = path.join(__dirname, "transformers/options.ts");
    const value = "foo";
    const options: tstl.CompilerOptions = { tsTransformers: [{ transform, value }] };

    expect(util.transpileAndExecute("return", options)).toBe(value);
});

test("should error if transformer could not be resolved", () => {
    const transform = path.join(__dirname, "transformers/error.ts");
    const options: tstl.CompilerOptions = { tsTransformers: [{ transform }] };
    const { diagnostics } = util.transpileStringResult("", options);
    expect(diagnostics).toHaveDiagnostics();
});
