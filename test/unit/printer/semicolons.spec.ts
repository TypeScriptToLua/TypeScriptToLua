import * as util from "../../util";

test.each(["const a = 1; const b = a;", "const a = 1; let b: number; b = a;", "{}", "function bar() {} bar();"])(
    "semicolon insertion (%p)",
    leadingStatement => {
        util.testFunction`
            let result = "";
            function foo() { result = "foo"; }
            ${leadingStatement}
            (undefined || foo)();
            return result;
        `
            .expectToMatchJsResult()
            .expectLuaToMatchSnapshot();
    }
);
