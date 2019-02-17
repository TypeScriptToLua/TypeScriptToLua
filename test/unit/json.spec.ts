import { Expect, Test, TestCase } from "alsatian";
import { transpileString } from "../../src/Compiler";
import { TranspileError } from "../../src/TranspileError";
import * as util from "../src/util";

export class JsonTests {
    @Test("JSON")
    @TestCase("0")
    @TestCase('""')
    @TestCase("[]")
    @TestCase('[1, "2", []]')
    @TestCase('{ "a": "b" }')
    @TestCase('{ "a": { "b": "c" } }')
    public json(json: string): void {
        const lua = transpileString(json, { resolveJsonModule: true, noHeader: true }, false, "file.json")
            .replace(/^return ([\s\S]+);$/, "return JSONStringify($1);");

        const result = util.executeLua(lua);
        Expect(JSON.parse(result)).toEqual(JSON.parse(json));
    }

    @Test("Empty JSON")
    public emptyJson(): void {
        Expect(() => transpileString("", { resolveJsonModule: true, noHeader: true }, false, "file.json"))
            .toThrowError(TranspileError, "Invalid JSON file content");
    }
}
