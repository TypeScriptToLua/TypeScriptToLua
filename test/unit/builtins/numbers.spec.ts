import * as util from "../../util";

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
])("%s", code => {
    util.testExpression(code).expectToMatchJsResult();
});

test.skip.each(["NaN", "Infinity"])("%s reassignment", name => {
    util.testFunction`
        const ${name} = 1;
        return ${name};
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

const toStringRadixes = [undefined, 10, 2, 8, 9, 16, 17, 36, 36.9];
const toStringValues = [-1, 0, 1, 1.5, 1024, 1.2];
const toStringPairs = toStringValues.flatMap(value => toStringRadixes.map(radix => [value, radix] as const));

test.each(toStringPairs)("(%p).toString(%p)", (value, radix) => {
    util.testExpressionTemplate`(${value}).toString(${radix})`.expectToMatchJsResult();
});

test.each([NaN, Infinity, -Infinity])("%p.toString(2)", value => {
    util.testExpressionTemplate`(${value}).toString(2)`.expectToMatchJsResult();
});

test.each(cases)("isNaN(%p)", value => {
    util.testExpressionTemplate`isNaN(${value} as any)`.expectToMatchJsResult();
});

test.each(cases)("isFinite(%p)", value => {
    util.testExpressionTemplate`isFinite(${value} as any)`.expectToMatchJsResult();
});

test("number intersected method", () => {
    util.testFunction`
        type Vector = number & { normalize(): Vector };
        return ({ normalize: () => 3 } as Vector).normalize();
    `.expectToMatchJsResult();
});
