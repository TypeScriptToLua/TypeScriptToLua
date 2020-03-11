import * as path from "path";
import { resolvePlugin } from "../../../src/transpilation/utils";

test("resolve relative module paths", () => {
    expect(resolvePlugin("test", "test", __dirname, "./resolve.ts")).toMatchObject({
        result: true,
    });
});

test("load .js modules", () => {
    expect(resolvePlugin("test", "test", __dirname, path.join(__dirname, "resolve.js"))).toMatchObject({
        result: true,
    });
});

test("load .ts modules", () => {
    expect(resolvePlugin("test", "test", __dirname, path.join(__dirname, "resolve.ts"))).toMatchObject({
        result: true,
    });
});

test('"import" option', () => {
    expect(resolvePlugin("test", "test", __dirname, path.join(__dirname, "import.ts"), "named")).toMatchObject({
        result: true,
    });
});
