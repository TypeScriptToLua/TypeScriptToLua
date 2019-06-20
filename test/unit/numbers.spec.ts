import * as util from "../util";

test.each([
    "NaN === NaN",
    "NaN !== NaN",
    "NaN + NaN",
    "NaN - NaN",
    "NaN * NaN",
    "NaN / NaN",
    "NaN + 1",
    "1 + NaN",
    "1 / NaN",
    "NaN * 0",

    "Infinity",
    "Infinity - Infinity",
    "Infinity / -1",
    "Infinity * -1",
    "Infinity + 1",
    "Infinity - 1",
])("%s", code => util.testExpression(code).expectToMatchJsResult());

test("NaN reassignment", () => {
    util.testFunction`
        const NaN = 1;
        return NaN;
    `.expectToMatchJsResult();
});

test("Infinity reassignment", () => {
    util.testFunction`
        const Infinity = 1;
        return Infinity;
    `.expectToMatchJsResult();
});

const numberCases = [-1, 0, 1, 1.5, Infinity, -Infinity];
const stringCases = ["-1", "0", "1", "1.5", "Infinity", "-Infinity"];
const restCases = [true, false, "", " ", "\t", "\n", "foo", {}];
const cases = [...numberCases, ...stringCases, ...restCases];

describe("Number", () => {
    test.each(cases)("constructor(%p)", value => {
        util.testExpressionTemplate`Number(${value})`.expectToMatchJsResult();
    });

    test.each(cases)("isNaN(%p)", value => {
        util.testExpressionTemplate`Number.isNaN(${value} as any)`.expectToMatchJsResult();
    });

    test.each(cases)("isFinite(%p)", value => {
        util.testExpressionTemplate`Number.isFinite(${value} as any)`.expectToMatchJsResult();
    });
});

test.each(cases)("isNaN(%p)", value => {
    util.testExpressionTemplate`isNaN(${value} as any)`.expectToMatchJsResult();
});

test.each(cases)("isFinite(%p)", value => {
    util.testExpressionTemplate`isFinite(${value} as any)`.expectToMatchJsResult();
});
