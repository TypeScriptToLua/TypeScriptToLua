import * as util from "../util";
import { unsupportedNodeKind } from "../../src/transformation/utils/diagnostics";

test("Block statement", () => {
    util.testFunction`
        let a = 4;
        { let a = 42; }
        return a;
    `.expectToMatchJsResult();
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/860
test("Unsupported node adds diagnostic", () => {
    util.testModule`
        const a = () => {
            foo: "bar"
        };
    `.expectDiagnosticsToMatchSnapshot([unsupportedNodeKind.code]);
});
