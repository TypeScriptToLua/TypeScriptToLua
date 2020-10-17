import * as util from "../util";

describe("JSON", () => {
    test.each([0, "", [], [1, "2", []], { a: "b" }, { a: { b: "c" } }])("JSON (%p)", json => {
        util.testModule(JSON.stringify(json)).setMainFileName("main.json").expectToEqual(json);
    });

    test("empty file throws runtime error", () => {
        util.testModule("")
            .setMainFileName("main.json")
            .expectToEqual(new util.ExecutionError("Unexpected end of JSON input"));
    });
});

describe("shebang", () => {
    test("LF", () => {
        util.testModule`#!/usr/bin/env lua\n
            const foo = true;
        `.expectLuaToMatchSnapshot();
    });

    test("CRLF", () => {
        util.testModule`#!/usr/bin/env lua\r\n
            const foo = true;
        `.expectLuaToMatchSnapshot();
    });
});
