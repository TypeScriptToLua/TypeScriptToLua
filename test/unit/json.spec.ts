import { TSTLErrors } from "../../src/TSTLErrors";
import * as util from "../util";
import * as ts from "typescript";

const jsonOptions = {
    resolveJsonModule: true,
    noHeader: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
};

test.each(["0", '""', "[]", '[1, "2", []]', '{ "a": "b" }', '{ "a": { "b": "c" } }'])(
    "JSON (%p)",
    json => {
        const lua = util
            .transpileString(json, jsonOptions, false, "file.json")
            .replace(/^return ([\s\S]+)$/, "return JSONStringify($1)");

        const result = util.executeLua(lua);
        expect(JSON.parse(result)).toEqual(JSON.parse(json));
    },
);

test("Empty JSON", () => {
    expect(() => util.transpileString("", jsonOptions, false, "file.json")).toThrowExactError(
        TSTLErrors.InvalidJsonFileContent(util.nodeStub),
    );
});
