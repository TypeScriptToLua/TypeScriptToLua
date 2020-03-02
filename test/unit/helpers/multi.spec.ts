import * as util from "../../util";
import { InvalidMultiHelperFunctionUse } from "../../../src/transformation/utils/errors";

test.each<[string, any]>([
    ["let a; [a] = multi();", undefined],
    ["const [a] = multi();", undefined],
    ["const [a] = multi(1);", 1],
    ["const ar = [1]; const [a] = multi(...ar);", 1],
    ["const _ = null, [a] = multi(1);", 1],
    ["let a; for (const [a] = multi(1, 2); false; 1) {}", undefined],
    ["let a; for ([a] = multi(1, 2); false; 1) {}", 1],
])("valid multi call and assign (%s)", (statement, result) => {
    util.testModule`
        ${statement}
        export { a };
    `
        .setOptions({ types: ["typescript-to-lua/helpers"] })
        .setReturnExport("a")
        .expectToEqual(result);
});

test.each([
    "multi",
    "multi()",
    "({ multi });",
    "[] = multi()",
    "const [] = multi();",
    "const a = multi();",
    "const {} = multi();",
    "([a] = multi(1)) => {}",
])("invalid multi call (%s)", statement => {
    util.testModule`
        ${statement}
    `
        .setOptions({ types: ["typescript-to-lua/helpers"] })
        .expectToHaveDiagnosticOfError(InvalidMultiHelperFunctionUse(util.nodeStub));
});

test.each<[string, any]>([
    ["return multi();", undefined],
    ["return multi(1);", 1],
])("valid multi call return statement (%s)", (statement, result) => {
    util.testModule`
        export const [a] = (function() {
            ${statement}
        })();
    `
        .setOptions({ types: ["typescript-to-lua/helpers"] })
        .setReturnExport("a")
        .expectToEqual(result);
});

test("multi helper call with destructuring assignment side effects", () => {
    util.testModule`
        let a;
        export { a };
        [a] = multi(1);
    `
        .setOptions({ types: ["typescript-to-lua/helpers"] })
        .setReturnExport("a")
        .expectToEqual(1);
});
