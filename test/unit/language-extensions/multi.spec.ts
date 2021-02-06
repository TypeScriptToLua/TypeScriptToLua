import * as path from "path";
import * as util from "../../util";
import * as tstl from "../../../src";
import {
    invalidMultiFunctionUse,
    invalidMultiReturnAccess,
    invalidMultiFunctionReturnType,
} from "../../../src/transformation/utils/diagnostics";

const multiProjectOptions: tstl.CompilerOptions = {
    types: [path.resolve(__dirname, "../../../language-extensions")],
};

test("multi example use case", () => {
    util.testModule`
        function multiReturn(): LuaMultiReturn<[string, number]> {
            return $multi("foo", 5);
        }

        const [a, b] = multiReturn();
        export { a, b };
    `
        .setOptions(multiProjectOptions)
        .expectToEqual({ a: "foo", b: 5 });
});

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
    [`const [a = 1] = ${name}()`, 1],
    [`const [a = 1] = ${name}(2)`, 2],
    [`const ar = [1]; const [a] = ${name}(...ar)`, 1],
    [`const _ = null, [a] = ${name}(1)`, 1],
    [`let a; for (const [a] = ${name}(1, 2); false; 1) {}`, undefined],
    [`let a; for ([a] = ${name}(1, 2); false; 1) {}`, 1],
    [`let a; if ([a] = ${name}(1)) { ++a; }`, 2],
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
    ["const a = $multi();", [invalidMultiFunctionUse.code]],
    ["const {} = $multi();", [invalidMultiFunctionUse.code]],
    ["([a] = $multi(1)) => {}", [invalidMultiFunctionUse.code]],
    ["const [a = 0] = $multi()", [invalidMultiFunctionUse.code]],
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

test("$multi call with destructuring assignment side effects", () => {
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

test("allow $multi call in ArrowFunction body", () => {
    util.testFunction`
        const call = () => $multi(1);
        const [result] = call();
        return result;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(1);
});

test("forward $multi call in ArrowFunction body", () => {
    util.testFunction`
        const foo = () => $multi(1);
        const call = () => foo();
        const [result] = call();
        return result;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(1);
});

test.each(["0", "i"])("allow LuaMultiReturn numeric access (%s)", expression => {
    util.testFunction`
        ${multiFunction}
        const i = 0;
        return multi(1)[${expression}];
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(1);
});

test.each(["multi()['forEach']", "multi().forEach"])("disallow LuaMultiReturn non-numeric access", expression => {
    util.testFunction`
        ${multiFunction}
        return ${expression};
    `
        .setOptions(multiProjectOptions)
        .expectDiagnosticsToMatchSnapshot([invalidMultiReturnAccess.code]);
});

test("invalid $multi implicit cast", () => {
    util.testModule`
        function badMulti(): [string, number] {
            return $multi("foo", 42);
        }
    `
        .setOptions(multiProjectOptions)
        .expectDiagnosticsToMatchSnapshot([invalidMultiFunctionReturnType.code]);
});

test.each([
    { flag: true, result: 4 },
    { flag: false, result: 7 },
])("overloaded $multi/non-$multi return", ({ flag, result }) => {
    util.testFunction`
        function multiOverload(flag: true): LuaMultiReturn<[string, number]>;
        function multiOverload(flag: false): [string, number];
        function multiOverload(flag: boolean) {
            if (flag) {
                return $multi("foo", 4);
            } else {
                return ["bar", 7];
            }
        }
        const [x, y] = multiOverload(${flag});
        return y;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(result);
});

test("return $multi from try", () => {
    util.testFunction`
        function multiTest() {
            try {
                return $multi(1, 2);
            } catch {
            }
        }
        const [_, a] = multiTest();
        return a;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(2);
});

test("return $multi from catch", () => {
    util.testFunction`
        function multiTest() {
            try {
                throw "error";
            } catch {
                return $multi(1, 2);
            }
        }
        const [_, a] = multiTest();
        return a;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(2);
});

test("return LuaMultiReturn from try", () => {
    util.testFunction`
        ${multiFunction}
        function multiTest() {
            try {
                return multi(1, 2);
            } catch {
            }
        }
        const [_, a] = multiTest();
        return a;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(2);
});

test("return LuaMultiReturn from catch", () => {
    util.testFunction`
        ${multiFunction}
        function multiTest() {
            try {
                throw "error";
            } catch {
                return multi(1, 2);
            }
        }
        const [_, a] = multiTest();
        return a;
    `
        .setOptions(multiProjectOptions)
        .expectToEqual(2);
});
