import { transpileString } from "../../src/Compiler";
import { TranspileError } from "../../src/TranspileError";
import * as util from "../util";
import { TSTLErrors } from "../../src/TSTLErrors";

test.each(["0", '""', "[]", '[1, "2", []]', '{ "a": "b" }', '{ "a": { "b": "c" } }'])(
    "JSON (%p)",
    json => {
        const lua = transpileString(
            json,
            { resolveJsonModule: true, noHeader: true },
            false,
            "file.json",
        ).replace(/^return ([\s\S]+);$/, "return JSONStringify($1);");

        const result = util.executeLua(lua);
        expect(JSON.parse(result)).toEqual(JSON.parse(json));
    },
);

test("Empty JSON", () => {
    expect(() =>
        transpileString("", { resolveJsonModule: true, noHeader: true }, false, "file.json"),
    ).toThrowExactError(TSTLErrors.InvalidJsonFileContent(util.nodeStub));
});
