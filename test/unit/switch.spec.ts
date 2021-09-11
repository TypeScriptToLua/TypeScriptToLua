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

test.each([0, 1, 2, 3, 4])("switchWithBracketsBreakInConditional (%p)", inp => {
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

                if (result != 2) break;
            }
            case 3: {
                result = 3;
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

test("switch executes only one clause", () => {
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
    `.expectToMatchJsResult();
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

test("switch default case only", () => {
    util.testFunction`
        let out = 0;
        switch (4 as number) {
            default:
                out = 1
        }
        return out;
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

test.each([0, 1])("switch empty fallthrough to default (%p)", inp => {
    util.testFunction`
        const out = [];
        switch (${inp} as number) {
            case 1:
            default:
                out.push("default");

        }
        return out;
    `
        .expectLuaToMatchSnapshot()
        .expectToMatchJsResult();
});

test("switch does not pollute parent scope", () => {
    util.testFunction`
        let x: number = 0;
        let y = 1;
        switch (x) {
            case 0:
                let y = 2;
        }
        return y;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3, 4])("switch handles side-effects (%p)", inp => {
    util.testFunction`
        const out = [];

        let y = 0;
        function foo() {
            return y++;
        }

        let x = ${inp} as number;
        switch (x) {
            case foo():
                out.push(1);
            case foo():
                out.push(2);
            case foo():
                out.push(3);
            default:
                out.push("default");
            case foo():
        }

        out.push(y);
        return out;
    `.expectToMatchJsResult();
});

test.each([1, 2])("switch handles side-effects with empty fallthrough (%p)", inp => {
    util.testFunction`
        const out = [];

        let y = 0;
        function foo() {
            return y++;
        }

        let x = 0 as number;
        switch (x) {
            // empty fallthrough 1 or many times
            ${new Array(inp).fill("case foo():").join("\n")}
            default:
                out.push("default");

        }

        out.push(y);
        return out;
    `.expectToMatchJsResult();
});

test.each([1, 2])("switch handles side-effects with empty fallthrough (preceding clause) (%p)", inp => {
    util.testFunction`
        const out = [];

        let y = 0;
        function foo() {
            return y++;
        }

        let x = 0 as number;
        switch (x) {
            case 1:
                out.push(1);
            // empty fallthrough 1 or many times
            ${new Array(inp).fill("case foo():").join("\n")}
            default:
                out.push("default");

        }

        out.push(y);
        return out;
    `.expectToMatchJsResult();
});

test.each([0, 1, 2, 3, 4])("switch handles async side-effects (%p)", inp => {
    util.testFunction`
        (async () => {
            const out = [];

            let y = 0;
            async function foo() {
                return new Promise<number>((resolve) => y++ && resolve(0));
            }

            let x = ${inp} as number;
            switch (x) {
                case await foo():
                    out.push(1);
                case await foo():
                    out.push(2);
                case await foo():
                    out.push(3);
                default:
                    out.push("default");
                case await foo():
            }

            out.push(y);
            return out;
        })();
    `.expectToMatchJsResult();
});

const optimalOutput = (c: number) => util.testFunction`
    let x: number = 0;
    const out = [];
    switch (${c} as number) {
        case 0:
        case 1:
        case 2:
            out.push("0,1,2");
            break;
        default:
            x++;
            out.push("default = " + x);
        case 3: {
            out.push("3");
            break;
        }
        case 4:
    }
    out.push(x.toString());
    return out;
`;

test("switch produces optimal output", () => {
    optimalOutput(0).expectLuaToMatchSnapshot();
});

test.each([0, 1, 2, 3, 4, 5])("switch produces valid optimal output (%p)", inp => {
    optimalOutput(inp).expectToMatchJsResult();
});

describe("switch hoisting", () => {
    test("hoisting between cases", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                case 1:
                    result = hoisted();
                    break;
                case 2:
                    function hoisted() {
                        return "hoisted";
                    }
                    break;
            }
            return result;
        `.expectToMatchJsResult();
    });

    test("indirect hoisting between cases", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                case 1:
                    function callHoisted() {
                        return hoisted();
                    }
                    result = callHoisted();
                    break;
                case 2:
                    function hoisted() {
                        return "hoisted";
                    }
                    break;
            }
            return result;
        `.expectToMatchJsResult();
    });

    test("hoisting in case expression", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                case hoisted():
                    result = "hoisted";
                    break;
                case 2:
                    function hoisted() {
                        return 1;
                    }
                    break;
            }
            return result;
        `.expectToMatchJsResult();
    });

    test("hoisting from default clause", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                case 1:
                    result = hoisted();
                    break;
                default:
                    function hoisted() {
                        return "hoisted";
                    }
                    break;
            }
            return result;
        `.expectToMatchJsResult();
    });

    test("hoisting from default clause is not duplicated when falling through", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                case 1:
                    result = hoisted();
                    break;
                case 2:
                    result = "2";
                default:
                    function hoisted() {
                        return "hoisted";
                    }
                    result = "default";
                case 3:
                    result = "3";
                }
            return result;
        `
            .expectToMatchJsResult()
            .expectLuaToMatchSnapshot();
    });

    test("hoisting from fallthrough clause after default is not duplicated", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                case 1:
                    result = hoisted();
                    break;
                case 2:
                    result = "2";
                default:
                    result = "default";
                case 3:
                    function hoisted() {
                        return "hoisted";
                    }
                    result = "3";
                }
            return result;
        `
            .expectToMatchJsResult()
            .expectLuaToMatchSnapshot();
    });

    test("hoisting in a solo default clause", () => {
        util.testFunction`
            let x = 1;
            let result = "";
            switch (x) {
                default:
                    result = hoisted();
                    function hoisted() {
                        return "hoisted";
                    }
            }
            return result;
        `.expectToMatchJsResult();
    });
});
