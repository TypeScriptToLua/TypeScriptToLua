import * as util from "../util";

test.each([0, "", [], [1, "2", []], { a: "b" }, { a: { b: "c" } }])("JSON (%p)", (json) => {
    util.testModule(JSON.stringify(json))
        .setMainFileName("main.json")
        .expectToEqual(json);
});

test("Empty JSON file error", () => {
    util.testModule("")
        .setMainFileName("main.json")
        .expectToEqual(new util.ExecutionError("Unexpected end of JSON input"));
});
