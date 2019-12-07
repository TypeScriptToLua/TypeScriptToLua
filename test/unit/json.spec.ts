import * as ts from "typescript";
import { InvalidJsonFileContent } from "../../src/transformation/utils/errors";
import * as util from "../util";

const jsonOptions = {
    resolveJsonModule: true,
    noHeader: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
};

test.each([0, "", [], [1, "2", []], { a: "b" }, { a: { b: "c" } }])("JSON (%p)", json => {
    util.testModule(JSON.stringify(json))
        .setOptions(jsonOptions)
        .setMainFileName("main.json")
        .expectToEqual(json);
});

test("Empty JSON", () => {
    util.testModule("")
        .setOptions(jsonOptions)
        .setMainFileName("main.json")
        .expectToHaveDiagnosticOfError(InvalidJsonFileContent(util.nodeStub));
});
