import * as util from "../../util";

test.each([
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

// Current implementation does not allow this
// eslint-disable-next-line jest/no-disabled-tests
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

    test.each(cases)("isInteger(%p)", value => {
        util.testExpressionTemplate`Number.isInteger(${value} as any)`.expectToMatchJsResult();
    });
});

const toStringRadixes = [undefined, 10, 2, 8, 9, 16, 17, 36, 36.9];
const toStringValues = [-1, 0, 1, 1.5, 1024, 1.2];
const toStringPairs = toStringValues.flatMap(value => toStringRadixes.map(radix => [value, radix] as const));

test.each(toStringPairs)("(%p).toString(%p)", (value, radix) => {
    util.testExpressionTemplate`(${value}).toString(${radix})`.expectToMatchJsResult();
});

test.each([
    [NaN, "(0/0)"],
    [Infinity, "(1/0)"],
    [-Infinity, "(-(1/0))"],
])("%p.toString(2)", (value, luaNativeSpecialNum) => {
    // Need to get the actual lua tostring version of inf/nan
    // this is platform dependent so we can/should not hardcode it
    const luaNativeSpecialNumString = util.testExpression`${luaNativeSpecialNum}.toString()`.getLuaExecutionResult();
    // Cannot use expectToMatchJsResult because this actually wont be the same in JS in Lua
    // TODO fix this in lualib/NumberToString.ts
    util.testExpressionTemplate`(${value}).toString(2)`.expectToEqual(luaNativeSpecialNumString);
});

const toFixedFractions = [undefined, 0, 1, 2, Math.PI, 5, 99];
// 1.5, 1.25 and 1.125 fails as rounding differ
const toFixedValues = [-1, 0, 1, Math.PI, -1.1234, -9.99e19, 1e22];
const toFixedPairs = toFixedValues.flatMap(value => toFixedFractions.map(frac => [value, frac] as const));
test.each(toFixedPairs)("(%p).toFixed(%p)", (value, frac) => {
    util.testExpressionTemplate`(${value}).toFixed(${frac})`.expectToMatchJsResult();
});

test.each([
    [NaN, "(0/0)"],
    [Infinity, "(1/0)"],
    [-Infinity, "(-(1/0))"],
])("%p.toFixed(2)", (value, luaNativeSpecialNum) => {
    // Need to get the actual lua tostring version of inf/nan
    // this is platform dependent so we can/should not hardcode it
    const luaNativeSpecialNumString = util.testExpression`${luaNativeSpecialNum}.toString()`.getLuaExecutionResult();
    // Cannot use expectToMatchJsResult because this actually wont be the same in JS in Lua
    util.testExpressionTemplate`(${value}).toFixed(2)`.expectToEqual(luaNativeSpecialNumString);
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

describe.each(["parseInt", "parseFloat", "Number.parseInt", "Number.parseFloat"])(
    "parse numbers with %s",
    parseFunction => {
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
    }
);

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

test.each(["Infinity", "-Infinity", "   -Infinity"])("Number.parseFloat handles Infinity", numberString => {
    util.testExpression`Number.parseFloat("${numberString}")`.expectToMatchJsResult();
});

test.each([
    { numberString: "36", base: 8 },
    { numberString: "-36", base: 8 },
    { numberString: "100010101101", base: 2 },
    { numberString: "-100010101101", base: 2 },
    { numberString: "3F", base: 16 },
])("Number.parseInt with base (%p)", ({ numberString, base }) => {
    util.testExpression`Number.parseInt("${numberString}", ${base})`.expectToMatchJsResult();
});

test.each(["0x4A", "-0x42", "0X42", "    0x391", "  -0x8F"])("Number.parseInt detects hexadecimal", numberString => {
    util.testExpression`Number.parseInt("${numberString}")`.expectToMatchJsResult();
});

test.each([1, 37, -100])("Number.parseInt with invalid base (%p)", base => {
    util.testExpression`Number.parseInt("11111", ${base})`.expectToMatchJsResult();
});

test.each([
    { numberString: "36px", base: 8 },
    { numberString: "10001010110231", base: 2 },
    { numberString: "3Fcolor", base: 16 },
])("Number.parseInt with base and trailing text (%p)", ({ numberString, base }) => {
    util.testExpression`Number.parseInt("${numberString}", ${base})`.expectToMatchJsResult();
});

// Issue #1218: https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1218
test.each(["42", "undefined"])("prototype call on nullable number (%p)", value => {
    util.testFunction`
        function toString(n?: number) {
            return n?.toString();
        }
        return toString(${value});
    `
        .setOptions({ strictNullChecks: true })
        .expectToMatchJsResult();
});

test.each([
    "Number.NEGATIVE_INFINITY <= Number.MIN_VALUE",
    "Number.MIN_VALUE <= Number.MIN_SAFE_INTEGER",

    "Number.MAX_SAFE_INTEGER <= Number.MAX_VALUE",
    "Number.MAX_VALUE <= Number.POSITIVE_INFINITY",
    "Number.MIN_SAFE_INTEGER < 0",

    "0 < Number.EPSILON",
    "Number.EPSILON < Number.MAX_SAFE_INTEGER",
])("Numer constants have correct relative sizes (%p)", comparison => {
    util.testExpression(comparison).expectToEqual(true);
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/1629
test("unary + casting to number (#1629)", () => {
    util.testFunction`
        let abc = "123";
        return [+abc, +"456"];
    `.expectToEqual([123, 456]);
});

test("unary - casting to number", () => {
    util.testFunction`
        let abc = "123";
        return [-abc, -"456"];
    `.expectToEqual([-123, -456]);
});
