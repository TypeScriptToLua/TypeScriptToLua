import * as path from "path";
import * as tstl from "../../src";
import * as util from "../util";

const testTransform = (name: string) => {
    const options: tstl.CompilerOptions = { tsTransformers: [{ name }] };
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
    const name = path.join(__dirname, "transformers/program.ts");
    const options: tstl.CompilerOptions = { tsTransformers: [{ name }] };

    expect(util.transpileAndExecute("return false", options)).toBe(true);
});

test("should pass extra options to transformers", () => {
    const name = path.join(__dirname, "transformers/options.ts");
    const value = "foo";
    const options: tstl.CompilerOptions = { tsTransformers: [{ name, value }] };

    expect(util.transpileAndExecute("return", options)).toBe(value);
});

test("should error if transformer could not be resolved", () => {
    const name = path.join(__dirname, "transformers/error.ts");
    const options: tstl.CompilerOptions = { tsTransformers: [{ name }] };
    const { diagnostics } = util.transpileStringResult("", options);
    expect(diagnostics).toHaveDiagnostics();
});

test.each([undefined, "string"])('should error if "name" has invalid %p value', (name: any) => {
    const options: tstl.CompilerOptions = { tsTransformers: [{ name }] };
    const { diagnostics } = util.transpileStringResult("", options);
    expect(diagnostics).toHaveDiagnostics();
});

test('should error if "when" has invalid "unknown" value', () => {
    const name = path.join(__dirname, "transformers/resolve.ts");
    const options: tstl.CompilerOptions = { tsTransformers: [{ name, when: "unknown" as any }] };
    const { diagnostics } = util.transpileStringResult("", options);
    expect(diagnostics).toHaveDiagnostics();
});
