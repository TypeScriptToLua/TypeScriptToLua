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

test("typeof class instance", () => {
    util.testFunction`
        class myClass {}
        let inst = new myClass();
        return typeof inst;
    `.expectToMatchJsResult();
});

test("typeof function", () => {
    util.testExpression`typeof (() => 3)`.expectToMatchJsResult();
});

test.each(["null", "undefined"])("typeof undefined (%p)", inp => {
    util.testExpression`typeof ${inp}`.expectToEqual("undefined");
});

test.each([
    { expression: "{}", operator: "===", compareTo: "object", expectResult: true },
    { expression: "{}", operator: "!==", compareTo: "object", expectResult: false },
    { expression: "{}", operator: "==", compareTo: "object", expectResult: true },
    { expression: "{}", operator: "!=", compareTo: "object", expectResult: false },
    { expression: "undefined", operator: "===", compareTo: "undefined", expectResult: true },
    { expression: "() => {}", operator: "===", compareTo: "function", expectResult: true },
    { expression: "1", operator: "===", compareTo: "number", expectResult: true },
    { expression: "true", operator: "===", compareTo: "boolean", expectResult: true },
    { expression: `"foo"`, operator: "===", compareTo: "string", expectResult: true },
])("typeof literal comparison (%p)", ({ expression, operator, compareTo, expectResult }) => {
    const code = `
        let val = ${expression};
        return typeof val ${operator} "${compareTo}";`;

    expect(util.transpileString(code)).not.toMatch("__TS__TypeOf");
    expect(util.transpileAndExecute(code)).toBe(expectResult);
});

test.each([
    { expression: "{}", operator: "===", compareTo: "object", expectResult: true },
    { expression: "{}", operator: "!==", compareTo: "object", expectResult: false },
    { expression: "{}", operator: "==", compareTo: "object", expectResult: true },
    { expression: "{}", operator: "!=", compareTo: "object", expectResult: false },
    { expression: "{}", operator: "<=", compareTo: "object", expectResult: true },
    { expression: "{}", operator: "<", compareTo: "object", expectResult: false },
    { expression: "undefined", operator: "===", compareTo: "undefined", expectResult: true },
    { expression: "() => {}", operator: "===", compareTo: "function", expectResult: true },
    { expression: "1", operator: "===", compareTo: "number", expectResult: true },
    { expression: "true", operator: "===", compareTo: "boolean", expectResult: true },
    { expression: `"foo"`, operator: "===", compareTo: "string", expectResult: true },
])("typeof non-literal comparison (%p)", ({ expression, operator, compareTo, expectResult }) => {
    const code = `
        let val = ${expression};
        let compareTo = "${compareTo}";
        return typeof val ${operator} compareTo;`;

    expect(util.transpileString(code)).toMatch("__TS__TypeOf");
    expect(util.transpileAndExecute(code)).toBe(expectResult);
});
