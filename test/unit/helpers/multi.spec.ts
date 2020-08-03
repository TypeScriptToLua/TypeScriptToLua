import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import { unsupportedMultiHelperFunctionPosition } from "../../../src/transformation/utils/diagnostics";

const multiProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../helpers")],
};

test.each<[string, any]>([
    ["return $multi();", undefined],
    ["return $multi(1);", 1],
    ["const ar = [1]; return $multi(...ar);", 1],
])("valid $multi call and assign (%s)", (statement, result) => {
    util.testFunction`
        ${statement}
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(result);
});

test.each<[string, number[]]>([
    ["$multi", [unsupportedMultiHelperFunctionPosition.code]],
    ["$multi()", [unsupportedMultiHelperFunctionPosition.code]],
    ["({ $multi });", [unsupportedMultiHelperFunctionPosition.code]],
    ["[] = $multi()", [unsupportedMultiHelperFunctionPosition.code]],
    ["const [] = $multi();", [unsupportedMultiHelperFunctionPosition.code]],
])("invalid $multi call (%s)", (statement, diagnostics) => {
    util.testModule`
        ${statement}
    `
        .setOptions(multiProjectOptions)
        .expectDiagnosticsToMatchSnapshot(diagnostics);
});
