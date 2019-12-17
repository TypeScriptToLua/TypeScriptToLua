import * as tstl from "../../../src";
import * as util from "../../util";

test.each([
    "Math.cos()",
    "Math.sin()",
    "Math.min()",
    "Math.log2(3)",
    "Math.log10(3)",
    "const x = Math.log2(3)",
    "const x = Math.log10(3)",
    "Math.log1p(3)",
    "Math.round(3.3)",
    "Math.PI",
])("%s", code => {
    // TODO: Remove?
    util.testFunction(code)
        .disableSemanticCheck()
        .expectLuaToMatchSnapshot();
});

test.each(["E", "LN10", "LN2", "LOG10E", "LOG2E", "SQRT1_2", "SQRT2"])("Math.%s", constant => {
    util.testExpression`Math.${constant}`.tap(builder => {
        expect(builder.getLuaExecutionResult()).toBeCloseTo(builder.getJsExecutionResult());
    });
});

const expectMathAtan2: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("math.atan2(");
const expectMathAtan: util.TapCallback = builder => expect(builder.getMainLuaCodeChunk()).toContain("math.atan(");

util.testEachVersion("Math.atan2", () => util.testExpression`Math.atan2(4, 5)`, {
    [tstl.LuaTarget.LuaJIT]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua51]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua52]: builder => builder.tap(expectMathAtan2),
    [tstl.LuaTarget.Lua53]: builder => builder.tap(expectMathAtan),
});

test("Math.atan2(4, 5)", () => {
    util.testExpression`Math.atan2(4, 5)`.expectToMatchJsResult();
});
