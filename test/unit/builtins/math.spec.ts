import * as tstl from "../../../src";
import * as util from "../../util";

// These test are kept to a minimum,
// because we just want to confirm translation is correct
// and not test Lua's built in math functions.
// Differences in math implementations between JS & Lua cause inaccuracies
// therefore test input numbers are "carefully" selected to always match accuratly.
// Lualib implementations are tested separately.
test.each([
    // log
    "Math.log(42)",
    "Math.log10(10)",
    "Math.log2(42)",
    "Math.log1p(42)",
    // round
    "Math.round(0.1)",
    "Math.round(0.9)",
    "Math.round(0.5)",
    // abs
    "Math.abs(-42)",
    "Math.abs(42)",
    // trigometric
    "Math.acos(0.42)",
    "Math.asin(0.42)",
    "Math.atan(0.42)",
    "Math.cos(42)",
    "Math.sin(42)",
    "Math.tan(42)",
    "Math.PI",
    // ceil & floor
    "Math.ceil(42.42)",
    "Math.floor(42.42)",
    // exp
    "Math.exp(42)",
    // max & min
    "Math.max(-42, 42)",
    "Math.max(42, -42)",
    "Math.max(42, 42)",
    "Math.max(-42, -42)",
    "Math.min(42, -42)",
    "Math.min(-42, 42)",
    "Math.min(42, 42)",
    "Math.min(-42, -42)",
    // pow
    "Math.pow(4.2, 4.2)",
    "Math.pow(4.2, -4.2)",
    "Math.pow(-4.2, -4.2)",
    // random
    // "Math.random()",
    // sqrt
    "Math.sqrt(2)",
    "Math.sqrt(-2)",
])("%s", code => {
    util.testExpression(code).expectToMatchJsResult();
});

// Hard to test properly
util.testExpression("Math.random()").expectNoExecutionError();

test.each(["E", "LN10", "LN2", "LOG10E", "LOG2E", "SQRT1_2", "SQRT2"])("Math.%s", constant => {
    util.testExpression`Math.${constant}`.tap(builder => {
        expect(builder.getLuaExecutionResult()).toBeCloseTo(builder.getJsExecutionResult());
    });
});

// LuaLib MathSign
test.each(["Math.sign(-42)", "Math.sign(42)", "Math.sign(-4.2)", "Math.sign(4.2)", "Math.sign(0)"])("%s", code => {
    util.testExpression(code).expectToMatchJsResult();
});

// LuaLib Atan2
const expectMathAtan2: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("math.atan2(");
const expectMathAtan: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("math.atan(");
const expectLualibMathAtan2: util.TapCallback = builder =>
    expect(builder.getMainLuaCodeChunk()).toContain("__TS__MathAtan2(");

util.testEachVersion("Math.atan2", () => util.testExpression`Math.atan2(4, 5)`, {
    [tstl.LuaTarget.Universal]: builder => builder.tap(expectLualibMathAtan2),
    [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua50]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua51]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua52]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua53]: builder => builder.tap(expectMathAtan),
    [tstl.LuaTarget.Lua54]: builder => builder.tap(expectMathAtan2),
});

util.testEachVersion(
    "Math.atan2(4, 5)",
    () => util.testExpression`Math.atan2(4, 5)`,
    util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
);

util.testEachVersion(
    "Math.pow(3, 5)",
    () => util.testExpression`Math.pow(3, 5)`,
    util.expectEachVersionExceptJit(builder => builder.expectToMatchJsResult())
);
