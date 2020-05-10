import * as util from "../../util";

test("If dead code after return", () => {
    util.testFunction`
        if (true) {
            return 3;
            const b = 8;
        }
    `.expectToMatchJsResult();
});

test("switch dead code after return", () => {
    util.testFunction`
        switch ("abc" as string) {
            case "def":
                return 4;
                let abc = 4;
            case "abc":
                return 5;
                let def = 6;
        }
    `.expectToMatchJsResult();
});

test("Function dead code after return", () => {
    util.testFunction`
        function abc() { return 3; const a = 5; }
        return abc();
    `.expectToMatchJsResult();
});

test("Method dead code after return", () => {
    util.testFunction`
        class def { public static abc() { return 3; const a = 5; } }
        return def.abc();
    `.expectToMatchJsResult();
});

test("for dead code after return", () => {
    const result = util.transpileAndExecute("for (let i = 0; i < 10; i++) { return 3; const b = 8; }");

    expect(result).toBe(3);
});

test("for..in dead code after return", () => {
    const result = util.transpileAndExecute('for (let a in {"a": 5, "b": 8}) { return 3; const b = 8; }');

    expect(result).toBe(3);
});

test("for..of dead code after return", () => {
    const result = util.transpileAndExecute("for (let a of [1,2,4]) { return 3; const b = 8; }");

    expect(result).toBe(3);
});

test("while dead code after return", () => {
    const result = util.transpileAndExecute("while (true) { return 3; const b = 8; }");

    expect(result).toBe(3);
});
