import * as util from "../util";
import { unsupportedNodeKind } from "../../src/transformation/utils/diagnostics";

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/860
test("Unsupported node adds diagnostic", () => {
    util.testModule`
        const a = () => {
            foo: "bar"
        };
    `.expectDiagnosticsToMatchSnapshot([unsupportedNodeKind.code]);
});
