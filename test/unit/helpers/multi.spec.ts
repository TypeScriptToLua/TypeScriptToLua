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
        import { multi } from "typescript-to-lua/helpers";
        ${statement}
        export { a };
    `
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
        import { multi } from "typescript-to-lua/helpers";
        ${statement}
    `.expectToHaveDiagnosticOfError(InvalidMultiHelperFunctionUse(util.nodeStub));
});

test.each<[string, any]>([
    ["return multi();", undefined],
    ["return multi(1);", 1],
])("valid multi call return statement (%s)", (statement, result) => {
    util.testModule`
        import { multi } from "typescript-to-lua/helpers";
        export const [a] = (function() {
            ${statement}
        })();
    `
        .setReturnExport("a")
        .expectToEqual(result);
});

test("multi helper call with destructuring assignment side effects", () => {
    util.testModule`
        import { multi } from "typescript-to-lua/helpers";
        let a;
        export { a };
        [a] = multi(1);
    `
        .setReturnExport("a")
        .expectToEqual(1);
});
