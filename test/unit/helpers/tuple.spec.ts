import * as util from "../../util";
import { InvalidTupleFunctionUse } from "../../../src/transformation/utils/errors";

test.each<[string, any]>([
    ["let a; [a] = tuple();", undefined],
    ["const [a] = tuple();", undefined],
    ["const [a] = tuple(1);", 1],
    ["const ar = [1]; const [a] = tuple(...ar);", 1],
])("valid tuple function assignment (%s)", (statement, result) => {
    util.testModule`
        import { tuple } from "typescript-to-lua";
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
    "let a; ([a] = tuple(1)) => {}",
])("invalid tuple function assignment (%s)", statement => {
    util.testModule`
        import { tuple } from "typescript-to-lua";
        ${statement}
    `.expectToHaveDiagnosticOfError(InvalidTupleFunctionUse(util.nodeStub));
});

test.each<[string, any]>([
    ["return tuple();", undefined],
    ["return tuple(1);", 1],
])("valid tuple function return statement (%s)", (statement, result) => {
    util.testModule`
      import { tuple } from "typescript-to-lua";
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
