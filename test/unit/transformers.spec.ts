import * as path from "path";
import * as tstl from "../../src";
import * as util from "../util";

const optionsOfTransformer = (transformer: tstl.TransformerImport): tstl.CompilerOptions => ({
    plugins: [transformer],
});

test("should ignore language service plugins", () => {
    const options: tstl.CompilerOptions = {
        plugins: [{ name: path.join(__dirname, "transformers/resolve.ts") }],
    };

    expect(util.transpileAndExecute("return", options)).toBe(undefined);
});

describe("resolution", () => {
    const testTransform = (transformer: tstl.TransformerImport) => {
        const options = optionsOfTransformer(transformer);
        expect(util.transpileAndExecute("return", options)).toBe(true);
    };

    test("should resolve relative transformer paths", () => {
        jest.spyOn(process, "cwd").mockReturnValue(__dirname);
        testTransform({ transform: "./transformers/resolve.ts" });
    });

    test("should load js transformers", () => {
        testTransform({ transform: path.join(__dirname, "transformers/resolve.js") });
    });

    test("should load ts transformers", () => {
        testTransform({ transform: path.join(__dirname, "transformers/resolve.ts") });
    });

    test('should support "import" option', () => {
        testTransform({
            transform: path.join(__dirname, "transformers/import.ts"),
            import: "transformer",
        });
    });

    test("should error if transformer could not be resolved", () => {
        const transform = path.join(__dirname, "transformers/error.ts");
        const options = optionsOfTransformer({ transform });
        const { diagnostics } = util.transpileStringResult("", options);
        expect(diagnostics).toHaveDiagnostics();
    });
});

describe("factory types", () => {
    const value = "foo";
    const getOptions = (options: Partial<tstl.TransformerImport>) =>
        optionsOfTransformer({
            transform: path.join(__dirname, "transformers/types.ts"),
            ...options,
        });

    test('should support "program" type', () => {
        const options = getOptions({ type: "program", import: "program", value });
        expect(util.transpileAndExecute("return false", options)).toBe(value);
    });

    test('should support "config" type', () => {
        const options = getOptions({ type: "config", import: "config", value });
        expect(util.transpileAndExecute("return", options)).toBe(value);
    });

    test('should support "checker" type', () => {
        const options = getOptions({ type: "checker", import: "checker", value });
        expect(util.transpileAndExecute("return false", options)).toBe(value);
    });

    test('should support "raw" type', () => {
        const options = getOptions({ type: "raw", import: "raw" });
        expect(util.transpileAndExecute("return", options)).toBe(true);
    });

    test('should support "compilerOptions" type', () => {
        const options: tstl.CompilerOptions = {
            ...getOptions({ type: "compilerOptions", import: "compilerOptions" }),
            luaTarget: tstl.LuaTarget.LuaJIT,
        };

        expect(util.transpileAndExecute("return", options)).toBe(true);
    });
});
