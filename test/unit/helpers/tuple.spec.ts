import * as util from "../../util";
import { InvalidTupleFunctionUse } from "../../../src/transformation/utils/errors";

test.each<[string, any]>([
    ["let a; [a] = tuple();", undefined],
    ["const [a] = tuple();", undefined],
    ["const [a] = tuple(1);", 1],
    ["const ar = [1]; const [a] = tuple(...ar);", 1],
    ["const _ = null, [a] = tuple(1);", 1],
    ["let a; for (const [a] = tuple(1, 2); false; 1) {}", undefined],
    ["let a; for ([a] = tuple(1, 2); false; 1) {}", 1],
])("valid tuple function assignment (%s)", (statement, result) => {
    util.testModule`
        import { tuple } from "typescript-to-lua/helpers";
        ${statement}
        // @ts-ignore
        return a;
    `.expectToEqual(result);
});

test.each([
    "tuple",
    "tuple()",
    "({ tuple });",
    "[] = tuple()",
    "const [] = tuple();",
    "const a = tuple();",
    "const {} = tuple();",
    "([a] = tuple(1)) => {}",
])("invalid tuple function assignment (%s)", statement => {
    util.testModule`
        import { tuple } from "typescript-to-lua/helpers";
        ${statement}
    `.expectToHaveDiagnosticOfError(InvalidTupleFunctionUse(util.nodeStub));
});

test.each<[string, any]>([
    ["return tuple();", undefined],
    ["return tuple(1);", 1],
])("valid tuple function return statement (%s)", (statement, result) => {
    util.testModule`
      import { tuple } from "typescript-to-lua/helpers";
      const [a] = (function() {
        ${statement}
      })();
      // @ts-ignore
      return a;
  `.expectToEqual(result);
});

test("tuple destructuring assignment side effects", () => {
    util.testModule`
        import { tuple } from "typescript-to-lua";
        let a, b;
        export { a };
        [a] = tuple(1);
        // @ts-ignore
        return a;
    `.expectToEqual(1);
});
