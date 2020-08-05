import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import {
    unsupportedMultiHelperFunctionPosition,
    invalidMultiReturnToNonArrayBindingPattern,
    invalidMultiReturnArrayBindingPatternElementInitializer,
    invalidMultiReturnToEmptyPatternOrArrayLiteral,
} from "../../../src/transformation/utils/diagnostics";

const multiProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../helpers")],
};

test.each<[string, any]>([
    ["let a; [a] = $multi();", undefined],
    ["const [a] = $multi();", undefined],
    ["const [a] = $multi(1);", 1],
    ["const ar = [1]; const [a] = $multi(...ar);", 1],
    ["const _ = null, [a] = $multi(1);", 1],
    ["let a; for (const [a] = $multi(1, 2); false; 1) {}", undefined],
    ["let a; for ([a] = $multi(1, 2); false; 1) {}", 1],
])("valid $multi call and assign (%s)", (statement, result) => {
    util.testModule`
        ${statement}
        export { a };
    `
        .setOptions(multiProjectOptions)
        .setReturnExport("a")
        .expectToEqual(result);
});

test.each<[string, number[]]>([
    ["$multi", [unsupportedMultiHelperFunctionPosition.code]],
    ["$multi()", [unsupportedMultiHelperFunctionPosition.code]],
    ["({ $multi });", [unsupportedMultiHelperFunctionPosition.code]],
    ["[] = $multi()", [invalidMultiReturnToEmptyPatternOrArrayLiteral.code]],
    ["const [] = $multi();", [invalidMultiReturnToEmptyPatternOrArrayLiteral.code]],
    ["const a = $multi();", [invalidMultiReturnToNonArrayBindingPattern.code]],
    ["const {} = $multi();", [invalidMultiReturnToNonArrayBindingPattern.code]],
    ["([a] = $multi(1)) => {}", [unsupportedMultiHelperFunctionPosition.code]],
    ["const [a = 0] = $multi()", [invalidMultiReturnArrayBindingPatternElementInitializer.code]],
])("invalid $multi call (%s)", (statement, diagnostics) => {
    util.testModule`
        ${statement}
    `
        .setOptions(multiProjectOptions)
        .expectDiagnosticsToMatchSnapshot(diagnostics);
});

test.each<[string, any]>([
    ["return $multi();", undefined],
    ["return $multi(1);", 1],
])("valid $multi call return statement (%s)", (statement, result) => {
    util.testModule`
        export const [a] = (function() {
            ${statement}
        })();
    `
        .setOptions(multiProjectOptions)
        .setReturnExport("a")
        .expectToEqual(result);
});

test("$multi helper call with destructuring assignment side effects", () => {
    util.testModule`
        let a;
        export { a };
        [a] = $multi(1);
    `
        .setOptions(multiProjectOptions)
        .setReturnExport("a")
        .expectToEqual(1);
});
