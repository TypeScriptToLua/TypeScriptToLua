import { TranspileError } from "../../src/TranspileError";
import { LuaTarget } from "../../src/CompilerOptions";
import * as util from "../util";

test.each([{ inp: 0, expected: 0 }, { inp: 1, expected: 1 }])("if (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let input: number = ${inp};
        if (input === 0) {
            return 0;
        }
        return 1;`,
    );

    expect(result).toBe(expected);
});

test.each([{ inp: 0, expected: 0 }, { inp: 1, expected: 1 }])(
    "ifelse (%p)",
    ({ inp, expected }) => {
        const result = util.transpileAndExecute(
            `let input: number = ${inp};
        if (input === 0) {
            return 0;
        } else {
            return 1;
        }`,
        );

        expect(result).toBe(expected);
    },
);

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: 3 },
])("ifelseif (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let input: number = ${inp};
        if (input === 0) {
            return 0;
        } else if (input === 1){
            return 1;
        } else if (input === 2){
            return 2;
        }
        return 3;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: 3 },
])("ifelseifelse (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let input: number = ${inp};
        if (input === 0) {
            return 0;
        } else if (input === 1){
            return 1;
        } else if (input === 2){
            return 2;
        } else {
            return 3;
        }`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -1 },
])("switch (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -2 },
])("switchdefault (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 1 },
    { inp: 0, expected: 1 },
    { inp: 2, expected: 4 },
    { inp: 3, expected: 4 },
    { inp: 4, expected: 4 },
    { inp: 5, expected: 15 },
    { inp: 7, expected: -2 },
])("switchfallthrough (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -2 },
])("nestedSwitch (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

        switch (<number>${inp}) {
            case 0:
                result = 0;
                break;
            case 1:
                switch(<number>${inp}) {
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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([{ inp: 0, expected: 0 }, { inp: 1, expected: 2 }, { inp: 2, expected: 2 }])(
    "switchLocalScope (%p)",
    ({ inp, expected }) => {
        const result = util.transpileAndExecute(
            `let result: number = -1;

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
    return result;`,
        );

        expect(result).toBe(expected);
    },
);

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -1 },
])("switchReturn (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `const result: number = -1;

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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -1 },
])("switchWithBrackets (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 0 },
    { inp: 1, expected: 1 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -1 },
])("switchWithBracketsBreakInConditional (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

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
        return result;`,
    );

    expect(result).toBe(expected);
});

test.each([
    { inp: 0, expected: 4 },
    { inp: 1, expected: 0 },
    { inp: 2, expected: 2 },
    { inp: 3, expected: -1 },
])("switchWithBracketsBreakInInternalLoop (%p)", ({ inp, expected }) => {
    const result = util.transpileAndExecute(
        `let result: number = -1;

        switch (<number>${inp}) {
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
        return result;`,
    );

    expect(result).toBe(expected);
});

test("If dead code after return", () => {
    const result = util.transpileAndExecute(`if (true) { return 3; const b = 8; }`);

    expect(result).toBe(3);
});

test("switch dead code after return", () => {
    const result = util.transpileAndExecute(
        `switch (<string>"abc") { case "def": return 4; let abc = 4; case "abc": return 5; let def = 6; }`,
    );

    expect(result).toBe(5);
});

test("switch not allowed in 5.1", () => {
    expect(() =>
        util.transpileString(`switch ("abc") {}`, { luaTarget: LuaTarget.Lua51 }),
    ).toThrowExactError(
        new TranspileError("Switch statements is/are not supported for target Lua 5.1."),
    );
});
