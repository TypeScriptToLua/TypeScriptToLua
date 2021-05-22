import * as tstl from "../../src";
import * as util from "../util";

test.each([0, 1])("if (%p)", inp => {
    util.testFunction`
        let input: number = ${inp};
        if (input === 0) {
            return 0;
        }
        return 1;
    `.expectToMatchJsResult();
});

test.each([0, 1])("ifelse (%p)", inp => {
    util.testFunction`
        let input: number = ${inp};
        if (input === 0) {
            return 0;
        } else {
            return 1;
        }
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("ifelseif (%p)", inp => {
    util.testFunction`
        let input: number = ${inp};
        if (input === 0) {
            return 0;
        } else if (input === 1){
            return 1;
        } else if (input === 2){
            return 2;
        }
        return 3;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("ifelseifelse (%p)", inp => {
    util.testFunction`
        let input: number = ${inp};
        if (input === 0) {
            return 0;
        } else if (input === 1){
            return 1;
        } else if (input === 2){
            return 2;
        } else {
            return 3;
        }
    `.expectToMatchJsResult();
});

test.each([
    { input: "true ? 'a' : 'b'" },
    { input: "false ? 'a' : 'b'" },
    { input: "true ? false : true" },
    { input: "false ? false : true" },
    { input: "true || true ? 'a' : 'b'" },
    { input: "true || false ? 'a' : 'b'" },
    { input: "false || true ? 'a' : 'b'" },
    { input: "false || false ? 'a' : 'b'" },
    { input: "true ? literalValue : true" },
    { input: "true ? variableValue : true" },
    { input: "true ? maybeUndefinedValue : true" },
    { input: "true ? maybeBooleanValue : true" },
    { input: "true ? maybeUndefinedValue : true", options: { strictNullChecks: true } },
    { input: "true ? maybeBooleanValue : true", options: { strictNullChecks: true } },
    { input: "true ? undefined : true", options: { strictNullChecks: true } },
    { input: "true ? null : true", options: { strictNullChecks: true } },
    { input: "true ? false : true", options: { luaTarget: tstl.LuaTarget.Lua51 } },
    { input: "false ? false : true", options: { luaTarget: tstl.LuaTarget.Lua51 } },
    { input: "true ? undefined : true", options: { luaTarget: tstl.LuaTarget.Lua51 } },
])("Ternary operator (%p)", ({ input, options }) => {
    util.testFunction`
        const literalValue = "literal";
        let variableValue: string;
        let maybeBooleanValue: string | boolean = false;
        let maybeUndefinedValue: string | undefined;
        return ${input};
    `
        .setOptions(options)
        .expectToMatchJsResult();
});

test.each([
    { condition: true, lhs: 4, rhs: 5 },
    { condition: false, lhs: 4, rhs: 5 },
    { condition: 3, lhs: 4, rhs: 5 },
])("Ternary Conditional (%p)", ({ condition, lhs, rhs }) => {
    util.testExpressionTemplate`${condition} ? ${lhs} : ${rhs}`.expectToMatchJsResult();
});

test.each(["true", "false", "a < 4", "a == 8"])("Ternary Conditional Delayed (%p)", condition => {
    util.testFunction`
        let a = 3;
        let delay = () => ${condition} ? a + 3 : a + 5;
        a = 8;
        return delay();
    `.expectToMatchJsResult();
});
