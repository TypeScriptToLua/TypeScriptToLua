import * as util from "../../util";
import {
    invalidMultiFunctionUse,
    invalidMultiReturnAccess,
    invalidMultiFunctionReturnType,
} from "../../../src/transformation/utils/diagnostics";

test("multi example use case", () => {
    util.testModule`
        function multiReturn(): LuaMultiReturn<[string, number]> {
            return $multi("foo", 5);
        }

        const [a, b] = multiReturn();
        export { a, b };
    `
        .withLanguageExtensions()
        .expectToEqual({ a: "foo", b: 5 });
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/995
test("Destructuring assignment of LuaMultiReturn", () => {
    util.testModule`
        function multiReturn(): LuaMultiReturn<[number, number, number]> {
            return $multi(1, 2, 3);
        }

        const [a, ...b] = multiReturn();
        export {a, b};
    `
        .withLanguageExtensions()
        .expectToEqual({ a: 1, b: [2, 3] });
});

test("Destructuring assignment of LuaMultiReturn returning nil", () => {
    util.testModule`
        function multiReturn(): LuaMultiReturn<[number, number, number]> {
            return;
        }

        const [a, ...b] = multiReturn();
        export {a, b};
    `
        .withLanguageExtensions()
        .expectToEqual({ a: undefined, b: [] });
});

test.each<[string, any]>([
    ["$multi()", undefined],
    ["$multi(true)", true],
    ["$multi(1, 2)", 1],
])("$multi call on return statement (%s)", (expression, result) => {
    util.testFunction`
        return ${expression};
    `
        .withLanguageExtensions()
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
        .withLanguageExtensions()
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
            .withLanguageExtensions()
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
        .withLanguageExtensions()
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
        .withLanguageExtensions()
        .expectToEqual(true);
});

test("$multi call with destructuring assignment side effects", () => {
    util.testModule`
        ${multiFunction}
        let a;
        export { a };
        [a] = multi(1);
    `
        .withLanguageExtensions()
        .setReturnExport("a")
        .expectToEqual(1);
});

test("allow $multi call in ArrowFunction body", () => {
    util.testFunction`
        const call = () => $multi(1);
        const [result] = call();
        return result;
    `
        .withLanguageExtensions()
        .expectToEqual(1);
});

test("forward $multi call", () => {
    util.testFunction`
        function foo() { return $multi(1, 2); }
        function call() { return foo(); }
        const [resultA, resultB] = call();
        return [resultA, resultB];
    `
        .withLanguageExtensions()
        .expectToEqual([1, 2]);
});

test("forward $multi call indirect", () => {
    util.testFunction`
        function foo() { return $multi(1, 2); }
        function call() { const m = foo(); return m; }
        const [resultA, resultB] = call();
        return [resultA, resultB];
    `
        .withLanguageExtensions()
        .expectToEqual([1, 2]);
});

test("forward $multi call in ArrowFunction body", () => {
    util.testFunction`
        const foo = () => $multi(1, 2);
        const call = () => foo();
        const [resultA, resultB] = call();
        return [resultA, resultB];
    `
        .withLanguageExtensions()
        .expectToEqual([1, 2]);
});

test("$multi call in function typed as any", () => {
    util.testFunction`
        function foo(): any { return $multi(1, 2); }
        return foo()
    `
        .withLanguageExtensions()
        .expectToHaveNoDiagnostics()
        .expectToEqual(1);
});

test("$multi call cast to any", () => {
    util.testFunction`
        function foo() { return $multi(1, 2) as any; }
        return foo()
    `
        .withLanguageExtensions()
        .expectToHaveNoDiagnostics()
        .expectToEqual(1);
});

test("$multi call cast to MultiReturn type", () => {
    util.testFunction`
        function foo() { return $multi(1, 2) as unknown as LuaMultiReturn<number[]>; }
        return foo()
    `
        .withLanguageExtensions()
        .expectToHaveNoDiagnostics()
        .expectToEqual(1);
});

test.each(["0", "i"])("allow LuaMultiReturn numeric access (%s)", expression => {
    util.testFunction`
        ${multiFunction}
        const i = 0;
        return multi(1)[${expression}];
    `
        .withLanguageExtensions()
        .expectToEqual(1);
});

test.each(["multi()['forEach']", "multi().forEach"])("disallow LuaMultiReturn non-numeric access", expression => {
    util.testFunction`
        ${multiFunction}
        return ${expression};
    `
        .withLanguageExtensions()
        .expectDiagnosticsToMatchSnapshot([invalidMultiReturnAccess.code]);
});

test("invalid $multi implicit cast", () => {
    util.testModule`
        function badMulti(): [string, number] {
            return $multi("foo", 42);
        }
    `
        .withLanguageExtensions()
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
        .withLanguageExtensions()
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
        .withLanguageExtensions()
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
        .withLanguageExtensions()
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
        .withLanguageExtensions()
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
        .withLanguageExtensions()
        .expectToEqual(2);
});
