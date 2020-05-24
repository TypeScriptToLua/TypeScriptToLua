import * as util from "../../util";

test.each([undefined, 1, "name"])("symbol.toString() (%p)", description => {
    util.testExpression`Symbol(${util.formatCode(description)}).toString()`.expectToMatchJsResult();
});

test.each([undefined, 1, "name"])("symbol.description (%p)", description => {
    // TODO: Supported since node 11
    util.testExpression`Symbol(${util.formatCode(description)}).description`.expectToEqual(description);
});

test("symbol uniqueness", () => {
    util.testExpression`Symbol("a") === Symbol("a")`.expectToMatchJsResult();
});

test("Symbol.for", () => {
    // TODO: Supported since node 11
    util.testExpression('Symbol.for("name").description').expectToEqual("name");
});

test("Symbol.for non-uniqueness", () => {
    util.testExpression`Symbol.for("a") === Symbol.for("a")`.expectToMatchJsResult();
});

test("Symbol.keyFor", () => {
    util.testFunction`
        const sym = Symbol.for("a");
        Symbol.for("b");
        return Symbol.keyFor(sym);
    `.expectToMatchJsResult();
});

test("Symbol.keyFor empty", () => {
    util.testFunction`
        Symbol.for("a");
        return Symbol.keyFor(Symbol());
    `.expectToMatchJsResult();
});
