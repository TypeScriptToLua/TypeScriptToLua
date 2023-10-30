import * as util from "../../util";

describe("Boolean", () => {
    const cases: Array<string | number | boolean> = ["1", "-1", "0", false, true, "false", "true", 1, -1, 0];

    test.each(cases)("constructor(%p)", value => {
        util.testExpressionTemplate`Boolean(${value})`.expectToMatchJsResult();
    });

    test.each(cases)("class(%p)", value => {
        util.testExpressionTemplate`new Boolean(${value}).valueOf() === Boolean(${value}).valueOf()`.expectToMatchJsResult();
    });
});
