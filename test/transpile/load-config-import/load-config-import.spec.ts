import * as path from "path";
import { loadConfigImport } from "../../../src/transpilation/utils";

test("resolve relative module paths", () => {
    const result = loadConfigImport("test", "test", __dirname, "./ts.ts");
    expect(result).toMatchObject({ result: true });
});

test("load .ts modules", () => {
    const result = loadConfigImport("test", "test", __dirname, path.join(__dirname, "ts.ts"));
    expect(result).toMatchObject({ result: true });
});

test("load CJS .js modules", () => {
    const result = loadConfigImport("test", "test", __dirname, path.join(__dirname, "cjs.js"));
    expect(result).toMatchObject({ result: true });
});

test("load transpiled ESM .js modules", () => {
    const result = loadConfigImport("test", "test", __dirname, path.join(__dirname, "transpiled-esm.js"));
    expect(result).toMatchObject({ result: true });
});

test('"import" option', () => {
    const result = loadConfigImport("test", "test", __dirname, path.join(__dirname, "import.ts"), "named");
    expect(result).toMatchObject({ result: true });
});
