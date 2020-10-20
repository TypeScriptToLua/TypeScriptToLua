import { loadConfigImport } from "../../src/compiler/utils";
import { resolveFixture } from "./run";

test("resolve relative module paths", () => {
    const result = loadConfigImport("test", "test", resolveFixture("load-config-import"), "./ts.ts");
    expect(result).toMatchObject({ result: true });
});

test("load .ts modules", () => {
    const result = loadConfigImport("test", "test", __dirname, resolveFixture("load-config-import/ts.ts"));
    expect(result).toMatchObject({ result: true });
});

test("load CJS .js modules", () => {
    const result = loadConfigImport("test", "test", __dirname, resolveFixture("load-config-import/cjs.js"));
    expect(result).toMatchObject({ result: true });
});

test("load transpiled ESM .js modules", () => {
    const result = loadConfigImport("test", "test", __dirname, resolveFixture("load-config-import/transpiled-esm.js"));
    expect(result).toMatchObject({ result: true });
});

test('"import" option', () => {
    const result = loadConfigImport("test", "test", __dirname, resolveFixture("load-config-import/import.ts"), "named");
    expect(result).toMatchObject({ result: true });
});
