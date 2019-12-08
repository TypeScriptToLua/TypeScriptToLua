import * as util from "../../util";
import { LuaTarget } from "../../../src";

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

test.each([LuaTarget.Lua51, LuaTarget.Lua52, LuaTarget.Lua53, LuaTarget.LuaJIT])("Math.atan2 (%p)", luaTarget => {
    util.testExpression`
        Math.atan2(4, 5);
    `
        .setOptions({ luaTarget })
        .expectLuaToMatchSnapshot();
});
