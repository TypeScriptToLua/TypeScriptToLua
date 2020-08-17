import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import {
    invalidMultiFunctionUse,
    invalidMultiTypeToNonArrayBindingPattern,
    invalidMultiTypeArrayBindingPatternElementInitializer,
} from "../../../src/transformation/utils/diagnostics";

const multiProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../helpers")],
};

test.each<[string, any]>([
    ["$multi()", undefined],
    ["$multi(true)", true],
    ["$multi(1, 2)", 1],
])("$multi call on return statement (%s)", (expression, result) => {
    util.testFunction`
        return ${expression};
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(result);
});

const multiFunction = `
function multi(...args) {
    return $multi(...args);
}
`;

const createCasesThatCall = (name: string): Array<[string, any]> => [
    [`let a; [a] = ${name}()`, undefined],
    [`const [a] = ${name}()`, undefined],
    [`const [a] = ${name}(1)`, 1],
    [`const ar = [1]; const [a] = ${name}(...ar)`, 1],
    [`const _ = null, [a] = ${name}(1)`, 1],
    [`let a; for (const [a] = ${name}(1, 2); false; 1) {}`, undefined],
    [`let a; for ([a] = ${name}(1, 2); false; 1) {}`, 1],
];

test.each<[string, any]>(createCasesThatCall("$multi"))("invalid direct $multi function use (%s)", statement => {
    util.testModule`
        ${multiFunction}
        ${statement}
        export { a };
    `
        .setOptions(multiProjectOptions)
        .setReturnExport("a")
        .expectDiagnosticsToMatchSnapshot([invalidMultiFunctionUse.code]);
});

test.each<[string, any]>(createCasesThatCall("multi"))(
    "valid indirect $multi function use (%s)",
    (statement, result) => {
        util.testModule`
            ${multiFunction}
            ${statement}
            export { a };
        `
            .setOptions(multiProjectOptions)
            .setReturnExport("a")
            .expectToEqual(result);
    }
);

test.each<[string, number[]]>([
    ["$multi", [invalidMultiFunctionUse.code]],
    ["$multi()", [invalidMultiFunctionUse.code]],
    ["({ $multi });", [invalidMultiFunctionUse.code]],
    ["const a = $multi();", [invalidMultiTypeToNonArrayBindingPattern.code]],
    ["const {} = $multi();", [invalidMultiTypeToNonArrayBindingPattern.code]],
    ["([a] = $multi(1)) => {}", [invalidMultiFunctionUse.code]],
    ["const [a = 0] = $multi()", [invalidMultiTypeArrayBindingPatternElementInitializer.code]],
])("invalid $multi call (%s)", (statement, diagnostics) => {
    util.testModule`
        ${statement}
    `
        .setOptions(multiProjectOptions)
        .expectDiagnosticsToMatchSnapshot(diagnostics);
});

test("function to spread multi type result from multi type function", () => {
    util.testFunction`
        ${multiFunction}
        function m() {
            return $multi(...multi(true));
        }
        return m();
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(true);
});

test("$multi helper call with destructuring assignment side effects", () => {
    util.testModule`
        ${multiFunction}
        let a;
        export { a };
        [a] = multi(1);
    `
        .setOptions(multiProjectOptions)
        .setReturnExport("a")
        .expectToEqual(1);
});
