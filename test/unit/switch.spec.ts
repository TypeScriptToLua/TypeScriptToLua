import * as tstl from "../../src";
import { unsupportedForTarget } from "../../src/transformation/utils/diagnostics";
import * as util from "../util";

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

test("switch not allowed in 5.1", () => {
    util.testFunction`
        switch ("abc") {}
    `
        .setOptions({ luaTarget: tstl.LuaTarget.Lua51 })
        .expectDiagnosticsToMatchSnapshot([unsupportedForTarget.code]);
});

// https://github.com/TypeScriptToLua/TypeScriptToLua/issues/967
test("switch default case not last - first", () => {
    util.testFunction`
        switch (3 as number) {
            default:
                return "wrong";
            case 3:
                return "right";
        }
    `.expectToMatchJsResult();
});

test("switch default case not last - second", () => {
    util.testFunction`
        switch (3 as number) {
            case 4:
                return "also wrong";
            default:
                return "wrong";
            case 3:
                return "right";
        }
    `.expectToMatchJsResult();
});

test("switch fallthrough enters default", () => {
    util.testFunction`
        const out = [];
        switch (3 as number) {
            case 3:
                out.push("3");
            default:
                out.push("default");
        }
        return out;
    `.expectToMatchJsResult();
});

test("switch fallthrough does not enter earlier default", () => {
    util.testFunction`
        const out = [];
        switch (3 as number) {
            default:
                out.push("default");
            case 3:
                out.push("3");
        }
        return out;
    `.expectToMatchJsResult();
});

test("switch fallthrough stops after default", () => {
    util.testFunction`
        const out = [];
        switch (4 as number) {
            default:
                out.push("default");
            case 3:
                out.push("3");
        }
        return out;
    `.expectToMatchJsResult();
});
