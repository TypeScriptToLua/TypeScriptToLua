import * as util from "../../util";

test.each([
    { initial: { a: 3 }, args: [{}] },
    { initial: {}, args: [{ a: 3 }] },
    { initial: { a: 3 }, args: [{ a: 5 }] },
    { initial: { a: 3 }, args: [{ b: 5 }, { c: 7 }] },
])("Object.assign (%p)", ({ initial, args }) => {
    const argsString = util.formatCode(...args);
    util.testExpression`Object.assign(${util.formatCode(initial)}, ${argsString})`.expectToMatchJsResult();
});

test.each([{}, { abc: 3 }, { abc: 3, def: "xyz" }])("Object.entries (%p)", obj => {
    util.testExpressionTemplate`Object.entries(${obj})`.expectToMatchJsResult();
});

test.each([{}, { abc: 3 }, { abc: 3, def: "xyz" }])("Object.keys (%p)", obj => {
    util.testExpressionTemplate`Object.keys(${obj})`.expectToMatchJsResult();
});

test.each([{}, { abc: "def" }, { abc: 3, def: "xyz" }])("Object.values (%p)", obj => {
    util.testExpressionTemplate`Object.values(${obj})`.expectToMatchJsResult();
});

test.each(["[]", '[["a", 1], ["b", 2]]', '[["a", 1], ["a", 2]]', 'new Map([["foo", "bar"]])'])(
    "Object.fromEntries(%s)",
    entries => {
        util.testExpression`Object.fromEntries(${entries})`.expectToMatchJsResult();
    }
);

describe(".toString()", () => {
    const toStringDeclaration = `
        function toString(value: object) {
            const result = value.toString();
            return result === "[object Object]" || result.startsWith("table: ") ? "table" : result;
        }
    `;

    test("class override", () => {
        util.testFunction`
            ${toStringDeclaration}
            class A {
                public toString() {
                    return "A";
                }
            }

            return toString(new A());
        `.expectToMatchJsResult();
    });

    test("inherited class override", () => {
        util.testFunction`
            ${toStringDeclaration}
            class A {
                public toString() {
                    return "A";
                }
            }

            class B extends A {}

            return { A: toString(new A()), B: toString(new B()) };
        `.expectToMatchJsResult();
    });

    test("don't affect inherited class", () => {
        util.testFunction`
            ${toStringDeclaration}
            class A {}

            class B extends A {
                public toString() {
                    return "B";
                }
            }

            return { A: toString(new A()), B: toString(new B()) };
        `.expectToMatchJsResult();
    });

    test("override inherited class override", () => {
        util.testFunction`
            ${toStringDeclaration}
            class A {
                public toString() {
                    return "A";
                }
            }

            class B extends A {
                public toString() {
                    return "B";
                }
            }

            return { A: toString(new A()), B: toString(new B()) };
        `.expectToMatchJsResult();
    });
});

describe(".hasOwnProperty()", () => {
    test("class field", () => {
        util.testFunction`
            class A {
                public field = true;
            }

            return new A().hasOwnProperty("field");
        `.expectToMatchJsResult();
    });

    test("class method", () => {
        util.testFunction`
            class A {
                public method() {}
            }

            return new A().hasOwnProperty("method");
        `.expectToMatchJsResult();
    });
});
