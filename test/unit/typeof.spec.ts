import * as util from "../util";

test.each(["0", "30", "30_000", "30.00"])("typeof number (%p)", inp => {
    util.testExpression`typeof ${inp}`.expectToMatchJsResult();
});

test.each(['"abc"', "`abc`"])("typeof string (%p)", inp => {
    util.testExpression`typeof ${inp}`.expectToMatchJsResult();
});

test.each(["false", "true"])("typeof boolean (%p)", inp => {
    util.testExpression`typeof ${inp}`.expectToMatchJsResult();
});

test.each(["{}", "[]"])("typeof object literal (%p)", inp => {
    util.testExpression`typeof ${inp}`.expectToMatchJsResult();
});

test("typeof class", () => {
    util.testFunction`
        class MyClass {}
        return typeof MyClass;
    `.expectToEqual("object");
});

test("typeof class instance", () => {
    util.testFunction`
        class MyClass {}
        return typeof new MyClass();
    `.expectToMatchJsResult();
});

test("typeof function", () => {
    util.testExpression`typeof (() => 3)`.expectToMatchJsResult();
});

test.each(["null", "undefined"])("typeof %s", inp => {
    util.testExpression`typeof ${inp}`.expectToEqual("undefined");
});

interface ComparisonCase {
    expression: string;
    operator: string;
    compareTo: string;
}

const equalityComparisonCases: ComparisonCase[] = [
    { expression: "{}", operator: "===", compareTo: "object" },
    { expression: "{}", operator: "!==", compareTo: "object" },
    { expression: "{}", operator: "==", compareTo: "object" },
    { expression: "{}", operator: "!=", compareTo: "object" },
    { expression: "undefined", operator: "===", compareTo: "undefined" },
    { expression: "() => {}", operator: "===", compareTo: "function" },
    { expression: "1", operator: "===", compareTo: "number" },
    { expression: "true", operator: "===", compareTo: "boolean" },
    { expression: `"foo"`, operator: "===", compareTo: "string" },
];

const relationalComparisonCases: ComparisonCase[] = [
    { expression: "undefined", operator: "<=", compareTo: "object" },
    { expression: "undefined", operator: "<", compareTo: "object" },
    { expression: "undefined", operator: ">=", compareTo: "object" },
    { expression: "undefined", operator: ">", compareTo: "object" },
];

const expectTypeOfHelper: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toMatch("__TS__TypeOf");
const expectNoTypeOfHelper: util.TapCallback = builder =>
    expect(builder.getMainLuaCodeChunk()).not.toMatch("__TS__TypeOf");

test.each(equalityComparisonCases)("typeof literal equality comparison (%p)", ({ expression, operator, compareTo }) => {
    util.testFunction`
        const value = ${expression};
        return typeof value ${operator} "${compareTo}";
    `
        .tap(expectNoTypeOfHelper)
        .expectToMatchJsResult();
});

test.each(relationalComparisonCases)("typeof literal comparison (%p)", ({ expression, operator, compareTo }) => {
    util.testFunction`
        const value = ${expression};
        return typeof value ${operator} "${compareTo}";
    `
        .tap(expectTypeOfHelper)
        .expectToMatchJsResult();
});

test.each([...equalityComparisonCases, ...relationalComparisonCases])(
    "typeof non-literal comparison (%p)",
    ({ expression, operator, compareTo }) => {
        util.testFunction`
            const value = ${expression};
            const compareTo = "${compareTo}";
            return typeof value ${operator} compareTo;
        `
            .tap(expectTypeOfHelper)
            .expectToMatchJsResult();
    }
);
