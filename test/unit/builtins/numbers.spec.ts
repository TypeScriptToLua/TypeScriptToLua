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

test("numbers overflowing the float limit become math.huge", () => {
    util.testExpression`1e309`.expectToMatchJsResult();
});

describe.each(["parseInt", "parseFloat"])("parse numbers with %s", parseFunction => {
    const numberStrings = ["3", "3.0", "9", "42", "239810241", "-20391", "3.1415", "2.7182", "-34910.3"];

    test.each(numberStrings)("parses (%s)", numberString => {
        util.testExpression`${parseFunction}("${numberString}")`.expectToMatchJsResult();
    });

    test("empty string", () => {
        util.testExpression`${parseFunction}("")`.expectToMatchJsResult();
    });

    test("invalid string", () => {
        util.testExpression`${parseFunction}("bla")`.expectToMatchJsResult();
    });

    test.each(["1px", "2300m", "3,4", "452adkfl"])("trailing text (%s)", numberString => {
        util.testExpression`${parseFunction}("${numberString}")`.expectToMatchJsResult();
    });

    test.each([" 3", "          4", "   -231", "    1px"])("leading whitespace (%s)", numberString => {
        util.testExpression`${parseFunction}("${numberString}")`.expectToMatchJsResult();
    });
});

test.each(["Infinity", "-Infinity", "   -Infinity"])("parseFloat handles Infinity", numberString => {
    util.testExpression`parseFloat("${numberString}")`.expectToMatchJsResult();
});

test.each([
    { numberString: "36", base: 8 },
    { numberString: "-36", base: 8 },
    { numberString: "100010101101", base: 2 },
    { numberString: "-100010101101", base: 2 },
    { numberString: "3F", base: 16 },
])("parseInt with base (%p)", ({ numberString, base }) => {
    util.testExpression`parseInt("${numberString}", ${base})`.expectToMatchJsResult();
});

test.each(["0x4A", "-0x42", "0X42", "    0x391", "  -0x8F"])("parseInt detects hexadecimal", numberString => {
    util.testExpression`parseInt("${numberString}")`.expectToMatchJsResult();
});

test.each([1, 37, -100])("parseInt with invalid base (%p)", base => {
    util.testExpression`parseInt("11111", ${base})`.expectToMatchJsResult();
});

test.each([
    { numberString: "36px", base: 8 },
    { numberString: "10001010110231", base: 2 },
    { numberString: "3Fcolor", base: 16 },
])("parseInt with base and trailing text (%p)", ({ numberString, base }) => {
    util.testExpression`parseInt("${numberString}", ${base})`.expectToMatchJsResult();
});
