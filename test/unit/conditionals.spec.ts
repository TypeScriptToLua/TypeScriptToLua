import * as tstl from "../../src";
import { UnsupportedForTarget } from "../../src/transformation/utils/errors";
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

test.each([0, 1, 2, 3])("switch (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (<number>${inp}) {
            case 0:
                result = 0;
                break;
            case 1:
                result = 1;
                break;
            case 2:
                result = 2;
                break;
        }
        return result;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("switchdefault (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (<number>${inp}) {
            case 0:
                result = 0;
                break;
            case 1:
                result = 1;
                break;
            case 2:
                result = 2;
                break;
            default:
                result = -2;
                break;
        }
        return result;
    `.expectToMatchJsResult();
});

test.each([0, 0, 2, 3, 4, 5, 7])("switchfallthrough (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (<number>${inp}) {
            case 0:
                result = 0;
            case 1:
                result = 1;
                break;
            case 2:
                result = 2;
            case 3:
            case 4:
                result = 4;
                break;
            case 5:
                result = 5;
            case 6:
                result += 10;
                break;
            case 7:
                result = 7;
            default:
                result = -2;
                break;
        }

        return result;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("nestedSwitch (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (${inp} as number) {
            case 0:
                result = 0;
                break;
            case 1:
                switch(${inp} as number) {
                    case 0:
                        result = 0;
                        break;
                    case 1:
                        result = 1;
                        break;
                    default:
                        result = -3;
                        break;
                }
                break;
            case 2:
                result = 2;
                break;
            default:
                result = -2;
                break;
        }
        return result;
    `.expectToMatchJsResult();
});

test("switch cases scope", () => {
    util.testFunction`
        switch (0 as number) {
            case 0:
                let foo: number | undefined = 1;
            case 1:
                foo = 2;
            case 2:
                return foo;
        }
    `.expectToMatchJsResult();
});

test("variable in nested scope does not interfere with case scope", () => {
    util.testFunction`
        let foo: number = 0;
        switch (foo) {
            case 0: {
                let foo = 1;
            }

            case 1:
                return foo;
        }
    `.expectToMatchJsResult();
});

test("switch using variable re-declared in cases", () => {
    util.testFunction`
        let foo: number = 0;
        switch (foo) {
            case 0:
                let foo = true;
            case 1:
                return foo;
        }
    `.expectToMatchJsResult();
});

test.each([0, 1, 2])("switch with block statement scope (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (<number>${inp}) {
            case 0: {
                let x = 0;
                result = 0;
                break;
            }
            case 1: {
                let x = 1;
                result = x;
            }
            case 2: {
                let x = 2;
                result = x;
                break;
            }
        }
        return result;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("switchReturn (%p)", inp => {
    util.testFunction`
        switch (<number>${inp}) {
            case 0:
                return 0;
                break;
            case 1:
                return 1;
            case 2:
                return 2;
                break;
        }

        return -1;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("switchWithBrackets (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (<number>${inp}) {
            case 0: {
                result = 0;
                break;
            }
            case 1: {
                result = 1;
                break;
            }
            case 2: {
                result = 2;
                break;
            }
        }
        return result;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("switchWithBracketsBreakInConditional (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (<number>${inp}) {
            case 0: {
                result = 0;
                break;
            }
            case 1: {
                result = 1;

                if (result == 1) break;
            }
            case 2: {
                result = 2;
                break;
            }
        }
        return result;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3])("switchWithBracketsBreakInInternalLoop (%p)", inp => {
    util.testFunction`
        let result: number = -1;

        switch (${inp} as number) {
            case 0: {
                result = 0;

                for (let i = 0; i < 5; i++) {
                    result++;

                    if (i >= 2) {
                        break;
                    }
                }
            }
            case 1: {
                result++;
                break;
            }
            case 2: {
                result = 2;
                break;
            }
        }
        return result;
    `.expectToMatchJsResult();
});

test("switch uses elseif", () => {
    test("array", () => {
        util.testFunction`
            let result: number = -1;

            switch (2 as number) {
                case 0: {
                    result = 200;
                    break;
                }

                case 1: {
                    result = 100;
                    break;
                }

                case 2: {
                    result = 1;
                    break;
                }
            }

            return result;
        `
            .expectLuaToMatchSnapshot()
            .expectToMatchJsResult();
    });
});

test("switch not allowed in 5.1", () => {
    util.testFunction`
        switch ("abc") {}
    `
        .setOptions({ luaTarget: tstl.LuaTarget.Lua51 })
        .expectToHaveDiagnosticOfError(UnsupportedForTarget("Switch statements", tstl.LuaTarget.Lua51, util.nodeStub));
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
    { input: "true ? false : true", options: { luaTarget: tstl.LuaTarget.LuaJIT } },
    { input: "false ? false : true", options: { luaTarget: tstl.LuaTarget.LuaJIT } },
    { input: "true ? undefined : true", options: { luaTarget: tstl.LuaTarget.LuaJIT } },
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
